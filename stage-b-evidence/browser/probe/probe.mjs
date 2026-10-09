import {createCareerSession} from '../../../src/career/session.v5.js';
import {commandFor} from '../../../src/career/engine.v5.js';
let session,state;
window.stageBProbe={async open(){session=createCareerSession();const r=await session.open();state=r.state;return{status:r.status,state};},async supply(){const r=await session.commit(commandFor(state,{type:'supply',familyId:state.activeSourceIds[0]}));return{ok:r.ok,status:r.status,code:r.code,warning:r.warning};}};
