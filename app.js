// const socket = require('socket.io');
const socket = require('socket.io-client')('http://localhost:3001'); 
const crypto = require('crypto');
const mongoose = require('mongoose');
const express = require('express');
const data = require('./data.json');

const app = express();
const server = app.listen(3001);
// const io = socket(server);
// const socketClient = io('http://localhost:3001');

mongoose.connect('mongodb+srv://rishirajanand5:R9c0nIBGxjUJrQWC@cluster0.pg9lazp.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

const dataSchema = new mongoose.Schema({
  name: String,
  origin: String,
  destination: String,
  secret_key: String,
  timestamp: Date,
});

const DataModel = mongoose.model('Data', dataSchema);



const secretKey = 'mySecureSecretKey123!@#'; // Replace with a secure secret key

function generateSecretKey(obj) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(obj));
  return hash.digest('hex');
}

function encryptMessage(payload, key) {
  const cipher = crypto.createCipher('aes-256-ctr', key);
  let encryptedMessage = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encryptedMessage += cipher.final('hex');
  return encryptedMessage;
}

function generateRandomData() {
  const randomNameIndex = Math.floor(Math.random() * data.names.length);
  const randomCityIndex = Math.floor(Math.random() * data.cities.length);
  return {
    name: data.names[randomNameIndex],
    origin: data.cities[randomCityIndex],
    destination: data.cities[randomCityIndex],
  };
}

function generateMessage() {
  const payload = generateRandomData();
  payload.secret_key = generateSecretKey(payload);
  const encryptedMessage = encryptMessage(payload, secretKey);
  return encryptedMessage;
}

setInterval(() => {
  const messageStream = Array.from({ length: Math.floor(Math.random() * 450) + 50 }, generateMessage).join('|');
  socket.emit('dataStream', messageStream);
}, 10000);

socket.on('connection', (socket) => {
  socket.on('dataStream', (messageStream) => {
    const messages = messageStream.split('|');
    messages.forEach((message) => {
      try {
        const decipher = crypto.createDecipher('aes-256-ctr', secretKey);
        let decryptedMessage = decipher.update(message, 'hex', 'utf8');
        decryptedMessage += decipher.final('utf8');
        const payload = JSON.parse(decryptedMessage);

        const calculatedSecretKey = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
        if (calculatedSecretKey === payload.secret_key) {
          payload.timestamp = new Date();
          const newData = new DataModel(payload);
          newData.save();
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
  });
});
