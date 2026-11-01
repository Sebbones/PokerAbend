import {parentPort} from 'node:worker_threads';
parentPort.postMessage({ready:true});
parentPort.on('message',()=>{while(true){/* Test fixture: parent must terminate this CPU job. */}});
