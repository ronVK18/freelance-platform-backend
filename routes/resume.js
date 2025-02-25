const express = require("express")
const resumeRouter = express.Router();
const multer=require("multer");
const fs=require("fs");
const pdfParse = require('pdf-parse');
const groq=require("groq-sdk")
const groqClient=new groq({
    apiKey:process.env.GROQ_API_KEY
})
const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"./uploads/")
    },
    filename:(req,file,cb)=>{
        cb(null,file.originalname)
    }
})
const upload=multer({storage:storage})
resumeRouter.post("/",upload.single("file"),async (req,res)=>{
    try {
        // console.log(req.file.path);
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(dataBuffer);
    // res.send(data.text);
    const extractData=await main(data.text);
    res.status(200).json({
        data:extractData
    });
    } catch (error) {
        res.status(500).json({message:"Unable to get data from resume beacuse of "+error.message})
    }
})
async function main(data) {
    try {
        const chatCompletion = await groqClient.chat.completions.create({
            messages: [{
                role: 'user', content: data+"Extract the data from the string and return it in a json format without any other text" }],
            model: "gemma2-9b-it",
        });
    
        const extractData=chatCompletion.choices[0].message.content
        let startIndex=extractData.indexOf("{");
        let endIndex=extractData.lastIndexOf("}");
        let jsonData=extractData.substring(startIndex,endIndex+1);
        jsonData=jsonData.trim();
        const jsonObject=await JSON.parse(jsonData);
        return jsonObject;
    } catch (error) {
        throw new Error(error.message)
    }
}

module.exports=resumeRouter