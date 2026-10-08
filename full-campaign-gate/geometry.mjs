import {BOARD_ART_BOUNDS} from '../src/matching/cohesion/boardArt.js';
export function compactInkViolations(image,bounds=BOARD_ART_BOUNDS){
 const b=bounds[image.pieceId];if(!b)return['Missing measured original-art bounds: '+image.pieceId];
 const [width,height]=image.display??[];if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return['Invalid displayed image size'];
 const ink=Math.max(b.ink[2]/b.source[0]*width,b.ink[3]/b.source[1]*height);
 return ink>=28?[]:[`Compact image ink below 28px: ${image.pieceId} (${ink})`];
}
