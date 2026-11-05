import handler from '../api/analytics/visit.js'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
process.env.VERCEL_ENV='production'
process.env.ANALYTICS_INGEST_SECRET='a'.repeat(32)
process.env.ANALYTICS_API_BASE_URL='https://backend.example/api'
const calls=[]
global.fetch=async (url,options)=>{calls.push({url:String(url),...options});return {ok:true}}
const base={visitId:randomUUID(),visitorId:randomUUID()}
async function invoke(body,headers={},method='POST') {
  const res={statusCode:0,setHeader(){},status(code){this.statusCode=code;return this},end(){}}
  await handler({method,headers:{origin:'https://erp.example',host:'erp.example','x-vercel-ip-country':'HT',...headers},body},res)
  return res.statusCode
}
assert.equal(await invoke(base),204)
assert.equal(calls.at(-1).url,'https://backend.example/api/public/analytics/visits')
assert.deepEqual(JSON.parse(calls.at(-1).body),{...base,countryCode:'HT'})
const event={...base,eventType:'FORM_ERROR',attemptId:randomUUID(),reasonCode:'VALIDATION',countryCode:'CA',email:'private@example.com',password:'secret',verificationCode:'123456'}
assert.equal(await invoke(event),204)
assert.equal(calls.at(-1).url,'https://backend.example/api/public/analytics/signup-events')
assert.deepEqual(Object.keys(JSON.parse(calls.at(-1).body)).sort(),['visitId','visitorId','attemptId','eventType','reasonCode','countryCode'].sort())
assert.equal(JSON.parse(calls.at(-1).body).countryCode,'HT')
assert.equal(await invoke({...base,eventType:'PAGE_VIEW',attemptId:null}),204)
for(const invalid of [{...event,reasonCode:'raw error'},{...event,attemptId:'bad'},{...event,eventType:'UNKNOWN'},{...base,eventType:'PAGE_VIEW',attemptId:randomUUID()}])assert.equal(await invoke(invalid),400)
assert.equal(await invoke(base,{origin:'https://other.example'}),403)
assert.equal(await invoke(base,{origin:undefined}),403)
assert.equal(await invoke(base,{},'GET'),405)
process.env.ANALYTICS_API_BASE_URL='http://backend.example/api'
assert.equal(await invoke(base),503)
process.env.VERCEL_ENV='preview'
assert.equal(await invoke(base),204)
console.log('PASS: proxy compatibility, origin checks, identifiers, fixed event/reason enums, server-only country, no sensitive payload forwarding')
