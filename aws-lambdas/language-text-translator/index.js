const AWS = require('aws-sdk');
const translate = new AWS.Translate();
const s3 = new AWS.S3();
let source_language_code = process.env.SourceLanguageCode;
let target_language_code = process.env.TargetLanguageCode;
const srcGetBucket = process.env.srcGetBucket;
const srcPutBucket = process.env.srcPutBucket;


exports.handler = (event, context, callback) => {
    
    
  
    //   console.log('Process Started')
    console.log('event', event )
    if(event.Records && event.Records.length > 0 ){
      console.log('In Side Validation')
      const filename = event.Records[0]['s3']['object']['key'];
      console.log('filename', filename)
      readdataFromS3(filename);
    } else if (event.body && event.body.transcript){
      const transcript = event.body.transcript;
    //   console.log('transcript',transcript)
      translateDataV1(transcript);
    } else if (event.query && event.query.transcript){
      const transcript = event.query.transcript;
      if(event.query.st && event.query.st != ''){
        source_language_code = event.query.st;
      }
      if(event.query.st && event.query.dt != ''){
        target_language_code = event.query.dt;
      }
    //   console.log('transcript',transcript)
      translateDataV1(transcript);
    }
    else{
      callback(null, 'No file is loaded');
    }
  
  
    function readdataFromS3(filename){
    const params = {
          Bucket: srcGetBucket,
          Key: filename
      }
    console.log('params', params);
    s3.getObject(params, function (err, res) {
            if (err) {
              callback(err);
            } else {
             if(res.Body){
               const data = JSON.parse(res.Body);
               const transcripts = (data['results'] &&  data['results']['transcripts'] &&
               data['results']['transcripts'].length > 0  )? data['results']['transcripts'][0]['transcript'] : '';
               console.log('data', transcripts);
               if(transcripts != '') {
                 translateDataV2(filename, transcripts);
               } else {
                 callback('No data to process');
               }
             }else{
               callback('No data to process');
             }
            }
        });
    }
  
  
    function translateDataV1(text){
     const params = {
        SourceLanguageCode: source_language_code, /* required */
        TargetLanguageCode: target_language_code, /* required */
        Text: text  /* required */
      };
      translate.translateText(params, function(err, data) {
        if (err) { 
          console.log(err, err.stack);
        } else {
          const TranslatedText = data['TranslatedText']?data['TranslatedText']:'';
          console.log('TranslatedText', TranslatedText);
          callback(null, TranslatedText);
        }           
      });
    }
  
    function translateDataV2(filename, text){
     const params = {
        SourceLanguageCode: source_language_code, /* required */
        TargetLanguageCode: target_language_code, /* required */
        Text: text  /* required */
      };
      translate.translateText(params, function(err, data) {
        if (err) { 
          console.log(err, err.stack);
        } else {
          const TranslatedText = data['TranslatedText']?data['TranslatedText']:'';
          console.log('TranslatedText', TranslatedText);
          storeFiletoS3(filename, {TranslatedText:TranslatedText});
        }           
      });
    }
  
  
    function storeFiletoS3( filename, data){
        const params = {
            Body: new Buffer(JSON.stringify(data), "binary"),
            Bucket: srcPutBucket + '/output',
            Key: filename,
        };
        s3.putObject(params, function (err, data) {
            if (err) {
                callback(err);
            } else {
                callback(null, 'Process Completed');         // successful response
            }
        });
    }
  
  
 
};