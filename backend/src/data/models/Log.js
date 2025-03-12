import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  payload: {type: Object, required: true },
  retryCount: {type: Number, required: false, default: 0},
  message: {type: String, required: false, default: ''},
  status: {
    type: String,
    enum: ['successful', 'failed', 'pending'], // Only these values are allowed
    required: true
  }
}, { timestamps: true });

const Log = mongoose.model('Log', LogSchema);
  
export default Log;