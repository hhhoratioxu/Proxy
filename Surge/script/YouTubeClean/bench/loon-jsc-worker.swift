// Compile on macOS: swiftc -O bench/loon-jsc-worker.swift -o /tmp/youtube-loon-jsc
// Fresh desktop JavaScriptCore host; never a native Loon/iPhone measurement.
import Foundation
import JavaScriptCore
import CryptoKit
import Darwin

let args=CommandLine.arguments
guard args.count==5 else { fatalError("worker <bundle-or-dist> <fixtures> <case> <setup.js>") }
let folder=args[2],name=args[3]
let descriptors=try JSONSerialization.jsonObject(with:Data(contentsOf:URL(fileURLWithPath:folder+"/cases.json"))) as! [[String:Any]]
let fixture=descriptors.first{$0["name"] as? String == name}!
let url=fixture["url"] as! String
var isDirectory:ObjCBool=false
FileManager.default.fileExists(atPath:args[1],isDirectory:&isDirectory)
let lane=fixture["phase"] as? String == "request" ? "request" : url.contains("/api/timedtext") ? "caption" : url.contains(".googlevideo.com/") ? "playback" : "api"
let bundle=isDirectory.boolValue ? args[1]+"/loon-"+lane+".js" : args[1]
let source=try String(contentsOfFile:bundle,encoding:.utf8),setup=try String(contentsOfFile:args[4],encoding:.utf8)
let context=JSContext()!
var failure:String?
context.exceptionHandler={_,value in failure=value?.toString() ?? "JSC exception"}
let reader:@convention(block)(String)->String={relative in (try! Data(contentsOf:URL(fileURLWithPath:folder+"/"+relative))).base64EncodedString()}
context.setObject(reader,forKeyedSubscript:"__readBase64" as NSString)
context.setObject(String(data:try JSONSerialization.data(withJSONObject:fixture),encoding:.utf8)!,forKeyedSubscript:"__fixtureJSON" as NSString)
context.evaluateScript(setup)
if let error=failure{fatalError(error)}
JSGarbageCollect(context.jsGlobalContextRef)
let began=DispatchTime.now().uptimeNanoseconds
context.evaluateScript(source)
for _ in 0..<10 {if context.objectForKeyedSubscript("__calls")!.toInt32()>0{break};context.evaluateScript("void 0")}
let elapsed=Double(DispatchTime.now().uptimeNanoseconds-began)/1e6
var usage=rusage();getrusage(RUSAGE_SELF,&usage)
let peak=Int64(usage.ru_maxrss) // Darwin reports bytes, unlike Linux's KiB.
if let error=failure{fatalError(error)}
let calls=context.objectForKeyedSubscript("__calls")!.toInt32(),requests=context.objectForKeyedSubscript("__requests")!.toInt32()
guard calls==1 else{fatalError("completion count \(calls)")}
let changed=context.evaluateScript("Boolean(__result && __result.body)")!.toBool()
guard changed==(fixture["expectedChanged"] as! Bool) else {fatalError("unexpected changed state")}
// Hashing/serialization is deliberately after the peak/time snapshot.
let output=Data(base64Encoded:context.evaluateScript("__encode(__result.body || __body)")!.toString()!)!
let digest=SHA256.hash(data:output).map{String(format:"%02x",$0)}.joined()
let headers=context.evaluateScript("JSON.stringify(__result.headers || {})")!.toString()!
let headerHash=SHA256.hash(data:headers.data(using:.utf8)!).map{String(format:"%02x",$0)}.joined()
let result:[String:Any]=["name":name,"bundle":URL(fileURLWithPath:bundle).lastPathComponent,"peakRss":peak,"elapsedMs":elapsed,"sha256":digest,"outputBytes":output.count,"requests":requests,"completions":calls,"requestHeaderSha256":lane=="request" ? headerHash : ""]
print(String(data:try JSONSerialization.data(withJSONObject:result,options:[.sortedKeys]),encoding:.utf8)!)
