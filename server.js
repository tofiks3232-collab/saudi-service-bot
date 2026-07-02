require('dotenv').config();
const express=require('express');
const app=express();
app.use(express.json());
app.get('/',(_,res)=>res.send('Saudi Service Bot Running'));
app.get('/webhook',(req,res)=>{
 if(req.query['hub.verify_token']===process.env.VERIFY_TOKEN){
   return res.send(req.query['hub.challenge']);
 }
 res.sendStatus(403);
});
app.post('/webhook',(req,res)=>{
 console.log(JSON.stringify(req.body,null,2));
 res.sendStatus(200);
});
app.listen(process.env.PORT||3000,()=>console.log('Started'));
