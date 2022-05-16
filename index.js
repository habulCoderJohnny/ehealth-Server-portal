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
          const bookingCollection = client.db("doctors_portal").collection("bookings");

          //GET DATA myOWN Inserted DATA
          app.get('/service', async(req,res) =>{
              const query = {};
              const cursor = serviceCollection.find(query);
              const services = await cursor.toArray();
              res.send(services);
          });

          //ADD BOOKING from client side| (client data ADD korte hole data ke read korte hobe data thake body er moddhe)
          app.post('/booking', async (req,res)=>{
              const booking = req.body;
              const result = await bookingCollection.insertOne(booking);
              res.send(result);
          }) //then working on client-side fetch:booking modal>line:29

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

/* API Naming Convention
* app.get('/booking') // GET ALL BOOKINGs in this collection. 
* or get more than one or by filter
* app.get('/booking/:id') // get a specific booking 
* app.post('/booking') // add a new booking
* app.patch('/booking/:id) //
* app.delete('/booking/:id) // 
*/