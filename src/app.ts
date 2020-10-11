import express, { Application, Request, Response, NextFunction } from 'express';
import { db } from './firebase';
import bodyParser from 'body-parser';
import passwordHash from 'password-hash';

declare global {
  namespace Express {
      export interface Request {
          user: any;
      }
  }
}

let jwt = require('jsonwebtoken');
const app : Application = express();
const PORT : number = 5000;
const secretKey = 'asdfjkl;';

app.use(bodyParser.json());

let validateUser = async (req : Request, res : Response, next : NextFunction) => {
  const token = req.header('Authorization')
  try {
    let username : string = jwt.decode(token, secretKey).username;
    let docRef = await db.collection('users').doc(username)
    let userRef = await docRef.get()
    if(!userRef.exists) throw 'Invalid user'; 
    req.user = docRef;
    next();
  }
  catch(e) {
    res.status(401).json({
      message : 'Unauthorized',
      error : e
    })
  }
}

app.use('/user', validateUser);

app.post('/user/budget/new', (req, res) => {
  console.log('test')
  let user = req.user;
  let price : number = req.body.price;
  let date : string = req.body.date;
  let description : string = req.body.description;

  user.collection('budget-items').add({
    price : price,
    date : date,
    description : description
  })
  .then((docRef : any) => res.json({ success : true }))
  .catch((e : any) => res.json({ success : false }))
})

app.get('/user/budget', async (req : Request, res : Response) => {
  let userRef = req.user;
  userRef.collection('budget-items').get()
  .then((querySnapshot : any) => {
    let items : any[] = []
    querySnapshot.forEach((doc : any) => {
      let item = doc.data()
      items.push({
        price : item.price,
        date : item.date,
        description : item.description
      })
    })
    res.json({ items : items })
  })
})

app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  let docRef = db.collection('users').doc(username);

  docRef.get().then((doc : any) => {
    if(doc.exists) {
      if(passwordHash.verify(password, doc.data().password)) {
        res.json({
          token : jwt.sign({ username : username }, secretKey),
          success : true        
        })
      }
    }
    res.json({ success : false })
  })

})

app.post('/signup', (req : Request, res : Response) => {
  const username : string = req.body.username;
  const password : string = passwordHash.generate(req.body.password)

  const docRef = db.collection('users').doc(username)

  if(!docRef.exists) {
    db.collection('users').doc(username).set({
      username : username,
      password : password
    })
    .then((docRef : any) => res.json({ isValidUser : true }
    ))
    .catch((e : Error) => res.json({ isValidUser : false }))
  }
  else res.json({ isValidUser : false });
})

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})