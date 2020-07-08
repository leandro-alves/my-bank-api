import express from 'express';
import mongoose from 'mongoose';

import { accountRouter } from './routes/accountRouter.js';

const app = express();

//require('dotenv').config();

(async () => {
    try {
        await mongoose.connect(
            'mongodb+srv://'+process.env.USERDB+':'+process.env.PWDDB+'@bootcampigti-gydz3.mongodb.net/users?retryWrites=true&w=majority', 
            {
                useNewUrlParser: true, 
                useUnifiedTopology: true
            }
        );        
    } catch (error) {
        console.log('Erro ao conectar no MongoDB ' + error);
    }
})();

app.use(express.json());
app.use(accountRouter);

app.listen(process.env.PORT, () => {
    console.log('API iniciada');
})