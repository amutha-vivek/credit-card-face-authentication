const mongoose = require("mongoose");

const fs = require("fs");
const path = require("path");

const creditCardDetails = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  cardNumber: {
    type: String,
    required: true,
    trim: true,
  },
  expiryDate: {
    type: String,
    required: true,
    trim: true,
  },
  securityCode: {
    type: Number,
    required: true,
    trim: true,
  },
  photo: {
    type: Buffer,
    required: true,
    trim: true,
  },
});

const CreditCardDetails = mongoose.model("creditCard", creditCardDetails);

// const imagePath = path.join(__dirname, "../../../opencv_frame_0.png");

// const newDetails = new CreditCardDetails({
//   name: "Abishek B",
//   cardNumber: "3566 0020 2036 0505",
//   expiryDate: "12/22",
//   securityCode: 123,
//   photo: fs.readFileSync(imagePath),
// });

// CreditCardDetails.photo.data = fs.readFileSync(imagePath);
// CreditCardDetails.photo.contentType = "img/png";
// CreditCardDetails.save();
// newDetails.save();

module.exports = CreditCardDetails;
