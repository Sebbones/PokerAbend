import {request} from '@playwright/test';
import {io} from 'socket.io-client';

// A real separate HTTP cookie jar per simulated human. Opening more sockets in
// the host page reuses its signed account cookie and takes over that same seat.
// These clients use the ordinary login and server-issued identity, without
// changing the identity code, fabricating IDs or weakening authorization.
export async function independentPlayer(app,code,name,seat){
  const http=await request.newContext({baseURL:app.url});let socket;
  const close=async()=>{socket?.disconnect();await http.dispose();};
  try{
    const login=await http.post('/login',{form:{password:app.password}});if(!login.ok())throw Error('Test player login failed');
    await http.get('/');const {cookies}=await http.storageState();
    socket=io(app.url,{transports:['websocket'],forceNew:true,reconnection:false,extraHeaders:{cookie:cookies.map(c=>`${c.name}=${c.value}`).join('; ')}});
    await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});
    const ask=(event,data={})=>socket.timeout(7000).emitWithAck(event,data);
    for(const [event,data]of [['join',{code,name,avatar:'🦊'}],['sit',seat===undefined?{}:{seat}]]){const reply=await ask(event,data);if(!reply.ok)throw Error(`${name}: ${event}: ${reply.error}`);}
    return {ask,close};
  }catch(error){await close();throw error;}
}
