// Own-process macOS JSC measurement. This is not an iOS VPN extension.
#include <JavaScriptCore/JavaScript.h>
#include <mach/mach.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
static unsigned long long peak_phys=0,peak_resident=0;
static int peak_supported=1;
static unsigned long long measure(void){
  task_vm_info_data_t info={0};mach_msg_type_number_t count=TASK_VM_INFO_COUNT;
  if(task_info(mach_task_self(),TASK_VM_INFO,(task_info_t)&info,&count)!=KERN_SUCCESS)exit(20);
  size_t end=offsetof(task_vm_info_data_t,ledger_phys_footprint_peak)+sizeof(info.ledger_phys_footprint_peak);
  if(count*sizeof(natural_t)<end||info.ledger_phys_footprint_peak<=0)peak_supported=0;
  else if((unsigned long long)info.ledger_phys_footprint_peak>peak_phys)peak_phys=info.ledger_phys_footprint_peak;
  if(info.resident_size_peak>peak_resident)peak_resident=info.resident_size_peak;
  return info.phys_footprint;
}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1000.0+t.tv_nsec/1e6;}
static JSValueRef evaluate(JSContextRef c,const char *code){
  JSStringRef s=JSStringCreateWithUTF8CString(code);JSValueRef error=NULL,value=JSEvaluateScript(c,s,NULL,NULL,1,&error);JSStringRelease(s);
  if(error){JSStringRef message=JSValueToStringCopy(c,error,NULL);char out[2048];JSStringGetUTF8CString(message,out,sizeof(out));fprintf(stderr,"%s\n",out);JSStringRelease(message);exit(21);}return value;
}
static char *read_file(const char *path){FILE *f=fopen(path,"rb");if(!f)exit(22);fseek(f,0,SEEK_END);long size=ftell(f);rewind(f);if(size<0||size>2097152)exit(23);char *out=malloc(size+1);if(!out||fread(out,1,size,f)!=(size_t)size)exit(23);out[size]=0;fclose(f);return out;}
int main(int argc,char **argv){
  if(argc!=4)return 2;int repeats=atoi(argv[3]);if(repeats<1||repeats>200)return 2;
  char *host=read_file(argv[1]),*script=read_file(argv[2]),*marked=malloc(strlen(script)+40),*result=NULL;
  strcpy(marked,script);strcat(marked,"\n;__hostReturned=true;\n");
  unsigned long long before=measure();double start=now();
  for(int i=0;i<repeats;i++){
    JSContextGroupRef group=JSContextGroupCreate();JSGlobalContextRef c=JSGlobalContextCreateInGroup(group,NULL);
    evaluate(c,host);measure();evaluate(c,marked);measure();
    for(int step=0;step<1000&&!JSValueToBoolean(c,evaluate(c,"__done"));step++){evaluate(c,"__step()");measure();}
    if(!JSValueToBoolean(c,evaluate(c,"__done")))return 24;
    JSStringRef s=JSValueToStringCopy(c,evaluate(c,"JSON.stringify(__verify())"),NULL);size_t size=JSStringGetMaximumUTF8CStringSize(s);
    free(result);result=malloc(size);JSStringGetUTF8CString(s,result,size);JSStringRelease(s);measure();
    JSGlobalContextRelease(c);JSContextGroupRelease(group);measure();
  }
  unsigned long long after=measure();
  printf("{\"peakFootprintSupported\":%s,\"peakFootprintBytes\":%llu,\"peakResidentBytes\":%llu,\"beforeFootprintBytes\":%llu,\"endFootprintBytes\":%llu,\"milliseconds\":%.3f,\"repeats\":%d,\"result\":%s}\n",peak_supported?"true":"false",peak_phys,peak_resident,before,after,now()-start,repeats,result);
  free(result);free(host);free(script);free(marked);return 0;
}
