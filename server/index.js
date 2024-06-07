// const express = require('express');
// const app = express();
// const cors = require('cors')
// const port = process.env.PORT || 3000;
// const dotenv = require('dotenv');
// dotenv.config();

// // middlewares
// app.use(express.json());
// app.use(cors());

// // username: jiya6021be21 
// // password: H47JHLDXELLGifYr


// const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1ywfwtx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();

//     // create db
//     const db = client.db("mernJobPortal");
//     const jobsCollections = db.collection("demoJobs");

//     // post a job
//     app.post("/post-job",async(req,res)=>{
//       const body=req.body;
//       body.createdAt=new Date();
//       // console.log(body)
//       const result=await jobsCollections.insertOne(body);
//       if(result.insertedId){
//           return res.status(200).send(result);
//       }
//       else{
//           return res.status(404).send({
//               message: "Cannot insert! try again later",
//               status: false
//           })
//       }
//   })

//   // get all jobs
//   app.get("/all-jobs",async(req,res)=>{
//       const jobs = await jobsCollections.find({}).toArray();
//       res.send(jobs);
//   })

//   // get single job using id
//   app.get("/all-jobs/:id", async(req,res)=>{
//     const id = req.params.id;
//     const job = await jobsCollections.findOne({
//       _id: new ObjectId(id)
//     });
//     res.send(job);
//   })
 
//   // get jobs by email
//   app.get("/my-jobs/:email",async(req,res)=>{
//     // console.log(req.params.email);
//     const jobs=await jobsCollections.find({postedBy : req.params.email}).toArray();
//     res.send(jobs);
//   })

//   // delete a job
//   app.delete("/job/:id",async(req,res)=>{
//     const id = req.params.id;
//     const filter = {_id: new ObjectId(id)}
//     const result = await jobsCollections.deleteOne(filter);
//     res.send(result);
//   })

//   // update a job
//   app.patch("/update-job/:id",async(req,res)=>{
//     const id=req.params.id;
//     const jobData=req.body;
//     const filter= {_id: new ObjectId(id)};
//     const options={upsert: true};
//     const updateDoc={
//       $set:{
//         ...jobData
//       }
//     }
//     const result=await jobsCollections.updateOne(filter,updateDoc,options);
//     res.send(result);
//   })


//   // Send a ping to confirm a successful connection
//   await client.db("admin").command({ ping: 1 });
//   console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }

// run().catch(console.dir);




// app.get("/",(req,res)=>{
//     res.send("Hello World!")
// })

// app.listen(port,()=>{
//     console.log(`App started on port ${port}`)
// })




const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

// middlewares
app.use(express.json());
app.use(cors());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1ywfwtx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    // create db
    const db = client.db("mernJobPortal");
    const jobsCollections = db.collection("demoJobs");
    // console.log("job collection is ", jobsCollections)
    const subscribersCollections = db.collection("subscribers");
    // console.log("subscribers collection is ", subscribersCollections)

    // post a job
    app.post("/post-job", async (req, res) => {
      const body = req.body;
      body.createdAt = new Date();
    
      try {
        const result = await jobsCollections.insertOne(body);
        if (result.insertedId) {
          // Get all subscribers
          const subscribers = await subscribersCollections.find({}).toArray();
          console.log(subscribers)
          const emails = subscribers.map(sub => sub.email);
    
          // Send email notifications to all subscribers
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emails,
            subject: `New Job Posted: ${body.jobTitle}`,
            text: `A new job has been posted: ${body.jobTitle}\n\n${body.description}`,
          };
    
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
    
          return res.status(200).send(result);
        } else {
          return res.status(404).send({
            message: "Cannot insert! try again later",
            status: false,
          });
        }
      } catch (error) {
        console.error('Error posting job:', error);
        return res.status(500).send({
          message: "An error occurred while posting the job",
          status: false,
        });
      }
    });

    // subscribe to job notifications
    app.post('/subscribe', async (req, res) => {
      const { email } = req.body;
      const newSubscriber = { email };

      const result = await subscribersCollections.insertOne(newSubscriber);
      if (result.insertedId) {
        res.status(201).send('Subscribed successfully');
      } else {
        res.status(500).send('Subscription failed');
      }
    });

    // get all jobs
    app.get("/all-jobs", async (req, res) => {
      const jobs = await jobsCollections.find({}).toArray();
      res.send(jobs);
    });

    // get single job using id
    app.get("/all-jobs/:id", async (req, res) => {
      const id = req.params.id;
      const job = await jobsCollections.findOne({
        _id: new ObjectId(id),
      });
      res.send(job);
    });

    // get jobs by email
    app.get("/my-jobs/:email", async (req, res) => {
      const jobs = await jobsCollections.find({ postedBy: req.params.email }).toArray();
      res.send(jobs);
    });

    // delete a job
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await jobsCollections.deleteOne(filter);
      res.send(result);
    });

    // update a job
    app.patch("/update-job/:id", async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...jobData,
        },
      };
      const result = await jobsCollections.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // Confirm successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`App started on port ${port}`);
});