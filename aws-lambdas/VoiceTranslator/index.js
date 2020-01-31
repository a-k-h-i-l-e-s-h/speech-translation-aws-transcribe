const AWS = require('aws-sdk');
const transcribeservice = new AWS.TranscribeService();
const s3bucket = process.env.s3bucket;
const languageCode = process.env.LanguageCode;
exports.handler = (event, context, callback) => {
    
    // console.log('event', event);
    // const epochtime = String(Number(new Date()));
    const params = {
        LanguageCode: languageCode, /* required */
        Media: { /* required */
            MediaFileUri: s3bucket + event['key'] +'.wav'
      },
      TranscriptionJobName: event['key'],            
      MediaFormat: 'wav',
      OutputBucketName: 'voicetranslatorapp-text',
    };
    // console.log('params', params);
    transcribeservice.startTranscriptionJob(params, function(err, data) {
    console.log('Process Completed')
      if (err){ 
        console.log(err, err.stack);
      } else {
        console.log(data);           // successful response
        // transcribeservice.getTranscriptionJob({TranscriptionJobName: 'Hindi' + epochtime}, function(err, data) {
        //   if (err) {
        //       console.log(err, err.stack);
        //   }else {
        //       console.log(data);           // successful response
        //   }// an error occurred
        // });
      }
      callback( null,'Process Complted')
    });
};