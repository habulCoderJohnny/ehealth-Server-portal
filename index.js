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

          //OPERATION: BOOKING date onojay Treatment service data load korbe
          app.get('/available', async (req,res)=>{
            const date = req.query.date;

            // step 1:  get all services
            const services = await serviceCollection.find().toArray();
      
            // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
            const query = {date: date};
            const thatDayBookings = await bookingCollection.find(query).toArray();
      
            // step 3: for each service
            services.forEach(service=>{
              // step 4: find bookings for that service. output: [{}, {}, {}, {}]
              const serviceBookings = thatDayBookings.filter(book => book.treatment === service.name);
              // step 5: select slots for the service Bookings: ['', '', '', '']
              const bookedSlots = serviceBookings.map(book => book.slot);
              // step 6: select those slots that are not in bookedSlots
              const available = service.slots.filter(slot => !bookedSlots.includes(slot));
              //step 7: set available to slots to make it easier 
              service.slots = available;
            });
            res.send(services);
           })

          //ADD BOOKING from client side| (client data ADD korte hole data ke read korte hobe data thake body er moddhe)
          app.post('/booking', async (req,res)=>{
              const booking = req.body;
             //Limit one booking per user per treatment/service per day 
             //(duplicate restricted)
              const query = {treatment: booking.treatment, date: booking.date, patientMail: booking.patientMail}
              const existService = await bookingCollection.findOne(query);
              if (existService) {
                 return res.send({success:false, booking:existService});
              } 
              const result = await bookingCollection.insertOne(booking);
              return res.send({success: true,  result});
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