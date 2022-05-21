const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


app.use(cors());
app.use(express.json());

//CONNECT TO MONGODB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.31y8m.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
//console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//Middleware
//jwt-token-to-backend-for-Verification
function verifiedToken(req,res,next){
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        //console.log('ABC');
     return res.status(401).send({message: 'UnAuthorized access! Kire tor token koi? Its not ur data!'});
    }

    //Iqnore Bearer
    const token = authHeader.split(' ')[1];
    // VERIFY user-token of 
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded){
    if (err) {
        return res.status(403).send({message: 'Forbidden! Access denied.'})
    } //Decoded valid user representor
    req.decoded = decoded;
    //console.log(decoded);
      next();
    });

}

  async function run() {
      try{
          await client.connect();
          //console.log('db connected!!');
          const serviceCollection = client.db("doctors_portal").collection("services");
          const bookingCollection = client.db("doctors_portal").collection("bookings");
          const userCollection = client.db("doctors_portal").collection("users");
          const doctorCollection = client.db("doctors_portal").collection("doctors");
          const paymentCollection = client.db("doctors_portal").collection("payments");

          const verifiedAdmin = async(req,res,next)=>{
            const adminRequester = req.decoded.email;
            const adminRequesterAccount = await userCollection.findOne({email: adminRequester});
            if (adminRequesterAccount.Role ==='Admin') {
                next();
            }
            else{
             res.status(403).send({message:"forbidden, Only admin can Access"});
            }

          }
          //GET DATA myOWN Inserted DATA
          app.get('/service', async(req,res) =>{
              const query = {};
              const cursor = serviceCollection.find(query).project({name:1});
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

          //Particular user booking data/info SENT to client FOR Displaying Dashboard using patientMail. Middleware:SecureData
          app.get('/booking', [verifiedToken], async (req,res)=>{
              const patientMail  = req.query.patientMail;
            //const authorization = req.headers.authorization;
            //console.log('authorization:', authorization);
            //operation: a user Try to data access of other user's valid token (resistance)
              const decodedEmail = req.decoded.email;
              if(patientMail===decodedEmail){ 
              const query = {patientMail:patientMail};
              const bookings =  await bookingCollection.find(query).toArray();
              res.send(bookings);
            }
            else{
                return res.status(403).send({message:"forbidden, Its not your cup of Tea"})
            }
     
          })

          app.get('/booking/:id', async (req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const booking = await bookingCollection.findOne(query);
            res.send(booking);

          })
          //Save Registered user information in the database
          app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'}) //Jwt token issue-1st then>Verify
            res.send({result, token});
          });

          //Without admin U cant entry users route
          app.get('/admin/:email', async (req,res)=>{
            const email = req.params.email;
            const user = await userCollection.findOne({email:email});
            const isAdmin = user.Role ==='Admin';
            res.send({admin: isAdmin})
          })


          //Add ADMIN Only who IS already Admin
          app.put('/user/admin/:email', [verifiedToken, verifiedAdmin], async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set:{ Role:'Admin'},
                };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
          });

        //OUR ALL USER INFO API 
          app.get('/users', verifiedToken, async(req,res)=>{
            const users = await userCollection.find().toArray();
            res.send(users);
          })

          //DOCTOR info Store
          app.post('/doctor', [verifiedToken, verifiedAdmin], async (req, res) => {
            const doctor = req.body;
            const result = await doctorCollection.insertOne(doctor);
            res.send(result);
          });

          //Doctor Stored data Load from DB
          app.get('/doctor', [verifiedToken, verifiedAdmin], async(req, res)=>{
            const doctors = await doctorCollection.find().toArray();
            res.send(doctors);
          })

          app.delete('/doctor/:email', [verifiedToken, verifiedAdmin], async (req, res) => {
            const email = req.params.email;
            const filter = {email: email};
            const result = await doctorCollection.deleteOne(filter);
            res.send(result);
           })

          //PAYMENT METHOD
          app.post('/create-payment-intent', verifiedToken, async (req,res)=>{
            const { price } = req.body;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount : amount,
              currency: 'usd',
              payment_method_types : ['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
          });

          //PAYMENT DATA RESERVED IN DATABASE
          app.patch('/booking/:id', verifiedToken, async(req, res) =>{
            const id  = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await bookingCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
          });
      } 
      finally{

      }
    
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World from doctors developing server')
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
* app.put('/booking/:id') // upsert ==> update (if exists) or insert (if doesn't exist)
* app.delete('/booking/:id) // 
*/