const path = require("path");
const spawn = require("child_process").spawn;
const fs = require("fs");

const AWS = require("aws-sdk");
const express = require("express");
const bodyParser = require("body-parser");
const hbs = require("hbs");
const session = require("express-session");
const multer = require("multer");

require("./db/mongoose");

const CreditCardDetails = require("./db/models/creditCardDetails");

const app = express();

app.use(
  session({
    secret: "credit card app",
    resave: false,
    saveUninitialized: false,
  })
);

const port = process.env.PORT || 4000;

const publicDirectoryPath = path.join(__dirname, "../public");
const viewsPath = path.join(__dirname, "../templates/views");

const sourceImageStoragePath = path.join(
  __dirname,
  "../source-image/source.png"
);

app.use(express.static(publicDirectoryPath));
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "hbs");
app.set("views", viewsPath);

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.get("/", (req, res) => {
  res.render("front_page");
});

app.get("/checkout", (req, res) => {
  res.render("checkout_page");
});

app.post("/card-data", async (req, res) => {
  const requestDetails = req.body;
  console.log(requestDetails);
  const securityCode = Number(requestDetails.securityCode);
  console.log(securityCode);
  const details = await CreditCardDetails.findOne({
    ...requestDetails,
    securityCode,
  });

  console.log(details);
  if (details) {
    fs.writeFileSync(sourceImageStoragePath, details.photo);
    res.render("checkout_page_with_btn");
  } else {
    console.log("Invalid details!");
    res.render("checkout_page_wrong_cred");
  }
});

app.get("/take-photo", async (req, res) => {
  const pythonFilePath = path.join(
    __dirname,
    "../face_detection/opencv/data/haarcascades/test.py"
  );
  try {
    const photoProcess = await spawn("python", [pythonFilePath]);
    photoProcess.stdout.on("data", async (data) => {
      let dataArray = JSON.stringify(data.toString());
      console.log(dataArray);
      // await setTimeout(async () => {
      const targetPath = path.join(__dirname, "../opencv_frame_0.png");
      const sourcePath = path.join(__dirname, "../source-image/source.png");

      const ID = "aws id";
      const SECRET = "aws secret key";

      const BUCKET_NAME = "credit-card"; // the bucketname without s3://

      const s3 = new AWS.S3({
        accessKeyId: ID,
        secretAccessKey: SECRET,
      });

      const uploadFile = async (fileName) => {
        // Read content from the file
        const fileContent = await fs.readFileSync(fileName);

        // Setting up S3 upload parameters
        const params = {
          Bucket: BUCKET_NAME,
          Key: fileName, // File name you want to save as in S3
          Body: fileContent,
        };

        // const params = {
        //   Bucket: BUCKET_NAME,
        //   key: targetPath,
        //   Body: fileContent,
        // };

        //Uploading files to the bucket
        await s3.upload(params, async function (err, data) {
          if (err) {
            throw err;
          }
          console.log(`File uploaded successfully. ${data.Location}`);
        });
      };

      await uploadFile(sourcePath);
      await uploadFile(targetPath);
      setTimeout(() => {
        compareFaces();
      }, 35000);

      // s3.createBucket(params, function (err, data) {
      //   if (err) console.log(err, err.stack);
      //   else console.log("Bucket Created Successfully", data.Location);
      // });

      // setTimeout(async () => {
      const compareFaces = () => {
        console.log("Comparing faces.");
        const config = new AWS.Config({
          accessKeyId: ID,
          secretAccessKey: SECRET,
          region: "ap-south-1",
        });

        AWS.config = config;

        const client = new AWS.Rekognition();
        const params = {
          SourceImage: {
            S3Object: {
              Bucket: BUCKET_NAME,
              Name: sourcePath,
            },
          },
          TargetImage: {
            S3Object: {
              Bucket: BUCKET_NAME,
              Name: targetPath,
            },
          },
        };
        client.compareFaces(params, function (err, response) {
          if (err) {
            console.log(err, err.stack); // an error occurred
            return res.render("checkout_page_with_btn_wrong_photo");
          } else if (response.FaceMatches.length === 0) {
            console.log("Face doesn't match");
            return res.render("checkout_page_with_btn_wrong_photo");
          } else {
            console.log("Response exists");
            console.log(response.FaceMatches);
            response.FaceMatches.forEach((data) => {
              let position = data.Face.BoundingBox;
              console.log("position: ", position);
              let similarity = data.Similarity;
              console.log("data: ", data);
              if (similarity > 70) {
                console.log(
                  `The face at: ${position.Left}, ${position.Top} matches with ${similarity} % confidence`
                );
                return res.render("success");
              }
              return res.render("checkout_page_with_btn_wrong_photo");
            }); // for response.faceDetails
          } //else {
          //   return res.render("checkout_page_with_btn_wrong_photo");
          // }
        });
      };
      // }, 2000);
      // }, 2000);
    });
    // photoProcess.stderr.pipe(process.stderr);
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log("Server started on port: " + port);
});
