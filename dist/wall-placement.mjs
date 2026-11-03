import {contain,dimsOf,clamp} from './geometry.mjs';
export function mountBoardBehindScreen(item,screen,room,catalog){
 const board={...item},d=dimsOf(board,catalog);board.y=clamp(board.y||0,0,Math.max(0,room.h-d[2]));
 if(screen){const sd=dimsOf(screen,catalog),r=(screen.rot||0)*Math.PI/180,gap=sd[1]/2+d[1]/2+.015;board.x=screen.x-Math.sin(r)*gap;board.z=screen.z-Math.cos(r)*gap;board.rot=screen.rot||0;}
 else{board.x=room.w/2;board.z=d[1]/2+.005;board.rot=0;}
 return contain(board,room,catalog);
}
