const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');

//middleware
app.use(cors());
app.use(express.json());

//CONNECT TO MONGODB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.31y8m.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
//console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

  async function run() {
      try{
          await client.connect();
          //console.log('db connected!!');
          const serviceCollection = client.db("doctors_portal").collection("services");

          //GET DATA myOWN Inserted DATA
          app.get('/service', async(req,res)=>{
              const query = {};
              const cursor = serviceCollection.find(query);
              const services = await cursor.toArray();
              res.send(services);
          })
          
      }
      finally{

      }
    
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World from doctors developing portal')
})

app.listen(port, () => {
  console.log(`Doctor app listening on port ${port}`)
})