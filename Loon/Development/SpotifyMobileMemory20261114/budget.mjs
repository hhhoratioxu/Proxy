import {readFileSync} from 'node:fs';
export const policy=JSON.parse(readFileSync(new URL('./memory-policy.json',import.meta.url),'utf8'));
export function assessPeak(bytes,target='mobile'){
  if(target==='mac-product')return {status:'not-applicable',limitBytes:null};
  if(target!=='mobile')throw Error('Unknown target');
  if(!Number.isSafeInteger(bytes)||bytes<0)return {status:'invalid-measurement',limitBytes:policy.mobile.maxPeakBytesExclusive};
  return {status:bytes<policy.mobile.maxPeakBytesExclusive?'below-limit':'over-limit',limitBytes:policy.mobile.maxPeakBytesExclusive};
}
export function assessDesktopScreen(report){
  if(report?.scope!=='macOS-JSC-mobile-runtime-screen'||!Array.isArray(report.runs)||!report.runs.length)return {screen:'invalid',mobileAcceptance:'unverified',releaseEligible:false};
  const good=report.runs.every(r=>r?.measurement?.peakFootprintSupported===true&&['peakFootprintBytes','peakResidentBytes'].every(k=>assessPeak(r.measurement[k]).status==='below-limit'));
  return {screen:good?'below-mobile-reference':'needs-investigation',mobileAcceptance:'unverified-needs-native-iOS-evidence',releaseEligible:false};
}
