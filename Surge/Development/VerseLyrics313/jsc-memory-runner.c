// Public macOS JavaScriptCore C API harness. Not the Loon/iOS VPN process.
#include <JavaScriptCore/JavaScript.h>
#include <mach/mach.h>
#include <sys/resource.h>
#include <time.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static unsigned long long peak=0;
static unsigned long long footprint(void){task_vm_info_data_t info;mach_msg_type_number_t count=TASK_VM_INFO_COUNT;if(task_info(mach_task_self(),TASK_VM_INFO,(task_info_t)&info,&count)!=KERN_SUCCESS)exit(20);if(info.phys_footprint>peak)peak=info.phys_footprint;return info.phys_footprint;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1000.0+t.tv_nsec/1e6;}
static void error(JSContextRef c,JSValueRef x){JSStringRef s=JSValueToStringCopy(c,x,NULL);size_t n=JSStringGetMaximumUTF8CStringSize(s);char *v=malloc(n);JSStringGetUTF8CString(s,v,n);fprintf(stderr,"%s\n",v);free(v);JSStringRelease(s);exit(21);}
static JSValueRef eval(JSContextRef c,const char *s){JSStringRef js=JSStringCreateWithUTF8CString(s);JSValueRef ex=NULL,r=JSEvaluateScript(c,js,NULL,NULL,1,&ex);JSStringRelease(js);if(ex)error(c,ex);return r;}
static char *readfile(const char *path){FILE *f=fopen(path,"rb");if(!f)exit(22);fseek(f,0,SEEK_END);long n=ftell(f);rewind(f);char *s=malloc(n+1);if(fread(s,1,n,f)!=(size_t)n)exit(23);s[n]=0;fclose(f);return s;}
int main(int argc,char **argv){if(argc<4)return 2;char *h=readfile(argv[1]),*script=readfile(argv[2]);int repeats=atoi(argv[3]);unsigned long long before=footprint();double start=now();char *result=NULL;
for(int i=0;i<repeats;i++){
 JSContextGroupRef group=JSContextGroupCreate();JSGlobalContextRef c=JSGlobalContextCreateInGroup(group,NULL);eval(c,h);footprint();eval(c,script);footprint();
 for(int j=0;j<1000&&!JSValueToBoolean(c,eval(c,"__done"));j++){eval(c,"__step()");footprint();}
 if(!JSValueToBoolean(c,eval(c,"__done")))return 24;
 JSValueRef value=eval(c,"JSON.stringify(__verify())");JSStringRef s=JSValueToStringCopy(c,value,NULL);size_t n=JSStringGetMaximumUTF8CStringSize(s);free(result);result=malloc(n);JSStringGetUTF8CString(s,result,n);JSStringRelease(s);footprint();JSGlobalContextRelease(c);JSContextGroupRelease(group);footprint();
}
struct rusage usage;getrusage(RUSAGE_SELF,&usage);printf("{\"sampledPeakFootprint\":%llu,\"beforeFootprint\":%llu,\"endFootprint\":%llu,\"maxRSS\":%ld,\"milliseconds\":%.3f,\"repeats\":%d,\"result\":%s}\n",peak,before,footprint(),usage.ru_maxrss,now()-start,repeats,result);free(result);free(h);free(script);return 0;}
