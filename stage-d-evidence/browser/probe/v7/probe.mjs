// New reconstruction; historical writer modules stay frozen.
import {createCareerSession} from '../../../../src/career/session.v7.js';import {commandFor} from '../../../../src/career/engine.v7.js';let session,state;
window.stageDV7Probe={async open(){session=createCareerSession();const r=await session.open();state=r.state;return r;},async supply(){if(!session)throw Error('Session not open');const r=await session.commit(commandFor(state,{type:'supply',familyId:state.activeSourceIds[0]}));state=r.state;return r;},snapshot(){return session.snapshot();}};
