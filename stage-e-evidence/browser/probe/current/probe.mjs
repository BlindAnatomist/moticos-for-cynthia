import {createCareerSession} from '../../../../src/career/session.js';
import {commandFor} from '../../../../src/career/engine.js';
let session;
window.stageEProbe={async open(){session=createCareerSession();return session.open();},async command(action){return session.commit(commandFor(session.snapshot().state,action));}};
