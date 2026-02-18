import { Application } from 'express';
import * as _ from "lodash";
import { verify } from '../modules/auth';
import { uploadStatusDAO } from '../objects/upload';
import { uploadDashboardDAO } from '../objects/upload';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config'

import { BlobServiceClient, 
        ContainerCreateResponse, 
        BlockBlobClient, 
        BlockBlobUploadResponse, 
        ContainerDeleteResponse, 
        BlobDownloadResponseParsed } from '@azure/storage-blob';


//const busboy = require('busboy');
import busboy from 'busboy';

export class UploadDetails {
  laCode: string = '';
  laName: string = '';
  userName: string = '';
  userEmail: string = '';
  citizensOverAge: string = '';
  fileFormat: string = '';
  electorTypes: string[] = [];
  otherInformation: string = '';
  fileName: string = '';
  fileSize: number = 0;
  fileMimeType: string = '';
  dataFileFolder: string = '';
  metadataFolder: string = '';
}

export default function (app: Application): void {

  const fileformats = [
    { value: '', text: 'Select a format' },
    { value: 'Express', text: 'Express' },
    { value: 'Strand', text: 'Strand' },
    { value: 'Halarose', text: 'Halarose' },
    { value: 'Xpress software solutions', text: 'Xpress software solutions' },
    { value: 'Other compatible formats', text: 'Other' },
  ];

  // Configure azure container client
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING as string; 
  if (!connectionString) throw Error('AZURE_STORAGE_CONNECTION_STRING not found');

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME as string; 
  const containerClient = blobServiceClient.getContainerClient(containerName);
    
 
  app.get('/data-upload', verify, async (req, res) => {

      const tmpErrors = _.clone(req.session.errors);
      const tmpBody = _.clone(req.session.formFields);
      delete req.session.errors;
      delete req.session.formFields;  

      // Call API to get upload status
      let statusDetails;
      let dashboardDetails;
      try {
        statusDetails = (await uploadStatusDAO.get(app, req.session?.authToken, req.session?.authentication?.laCode));
      } catch (err) {
        app.logger.crit('Failed to fetch status details for LA', {
          auth: req.session.authentication,
          error: typeof err.error !== 'undefined' ? err.error : err.toString(),
        });

        return res.render('_errors/generic', { err });
      }

      // Call API to get dashboard details
      try {
        dashboardDetails = (await uploadDashboardDAO.get(app, req.session?.authToken));
      } catch (err) {
        app.logger.crit('Failed to fetch dashboard details: ', {
          error: typeof err.error !== 'undefined' ? err.error : err.toString(),
        });
  
        return res.render('_errors/generic', { err });
      }

      app.logger.info('Status details: ', statusDetails);
      app.logger.info('Dashboard details: ', dashboardDetails);
      
      const uploadDeadlineDate = new Date(dashboardDetails.deadlineDate);
      const daysRemaining = dashboardDetails.daysRemaining;
      const uploadStatus = dashboardDetails.uploadStatus;
      const uploadWindowClosed = uploadDeadlineDate < new Date()

      if (uploadWindowClosed) {
        return res.redirect('data-upload-closed');
      }

      console.log('Rendering data upload form.  Errors: ', tmpErrors);

      return res.render('data-upload/data-upload.njk', {
        deadlineDate: uploadDeadlineDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        daysRemaining: daysRemaining,
        uploadStatus: uploadStatus,
        fileFormats: fileformats,
        fileUploadPostUrl: '/submit-data-upload',
        tmpBody,
        errors: tmpErrors
      });
  });


  app.get('/data-upload-closed', verify, (req, res) => {
    
    res.render('data-upload/data-upload-closed.njk', {
      deadlineValue: ''
    });
    
  });


  app.post('/submit-data-upload', (req, res, next:any) => {

    const uploadDetails: UploadDetails = new UploadDetails();
    const fileChunks: Buffer[] = [];
    let fileBuffer: any;
    let uploadFileSize: number = 0;
    let fileStream: NodeJS.ReadableStream | null = null;

    let fileTooLarge: boolean = false;
    let uploadValid: boolean = true;
    let uploadErrors: { [key: string]: string } = {};
    delete req.session.errors;

    uploadDetails.laCode = req.session?.authentication?.laCode || '';
    uploadDetails.laName = req.session?.authentication?.laName || '';
    uploadDetails.userName = req.session?.authentication?.username || '';
    uploadDetails.userEmail = req.session?.authentication?.userEmail || '';

    // Set azure storage folder names for data and metadata
    const currentDate = new Date();
    const dateFolder = currentDate.toISOString().slice(0,10).replace(/-/g,"");
    uploadDetails.metadataFolder = `${dateFolder}/LA_Data/${uploadDetails.laCode}-${uploadDetails.laName}`;
    uploadDetails.dataFileFolder = `${dateFolder}/LA_Data/${uploadDetails.laCode}-${uploadDetails.laName}`;

    // Verify container exists
    /*
    const exists = await containerClient.exists();
    if (!exists) {
      throw new Error(`Azure container "${containerName}" does not exist.`);
    }
    */

    // Check file does not exceed max size 100MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const fileSize = parseInt(req.headers['content-length'] || '0', 10);
    if (fileSize > MAX_FILE_SIZE) {
      console.log('File size exceeds maximum limit: ', { fileSize });
      uploadValid = false;
      uploadErrors = { ...uploadErrors, fileUpload: res.locals.text.VALIDATION.FILE_UPLOAD.FILE_TOO_LARGE };
    } else {
      console.log('Total content length: ', { fileSize });
    }


    // attempt to get form value from custom header
    uploadDetails.fileSize = parseInt(req.headers['content-length'] || '0', 10);
    if (req.headers['formfileformat']){
      uploadDetails.fileFormat = req.headers['formfileformat'] as string;
    }
    if (req.headers['formcitizensoverage']){
      uploadDetails.citizensOverAge = req.headers['formcitizensoverage'] as string;
    }
    if (req.headers['formfilename']){
      uploadDetails.fileName = req.headers['formfilename'] as string;
    }

    //uploadErrors = validateDetails(uploadDetails, res.locals.text.VALIDATION);

    if (Object.keys(uploadErrors).length > 0) {
      console.log('Form validation errors: ', uploadErrors);
      req.session.errors = _.clone(uploadErrors);
      uploadValid = false;
      console.log('Upload form invalid - redirect back to form');
      return res.redirect(303, '/data-upload');
    }


    const bb = busboy({ 
      headers: req.headers, 
      limits: { fileSize: MAX_FILE_SIZE }
    });

    // Process form fields
    bb.on('field', (fieldname: string, val: string) => {

      console.log(`[on Field] Field received fieldname: ${fieldname}  value: ${val}`);

      val = val.trim();

      if (fieldname === 'fileFormat') {
        uploadDetails.fileFormat = val;
      }
      
      if (fieldname === 'citizensOverAge') {
        uploadDetails.citizensOverAge = val;
      }

      if (fieldname === 'electorType') {
        uploadDetails.electorTypes.push(val);
      }

      if (fieldname === 'otherInformation') {
        uploadDetails.otherInformation = val;
      }

      if (fieldname === 'filename') {
        uploadDetails.fileName = val;
      }
      
    });

    // Process file upload
    bb.on('file', (fieldname: string, file: any, fileInfo: any, encoding: string, mimetype: string) => {
      
      uploadDetails.fileName = fileInfo.filename;
      uploadDetails.fileMimeType = fileInfo.mimeType;

      if (fileStream){
        file.resume();
        return;
      }

      file.pause();
      fileStream = file;

      if (!uploadDetails.fileName) {
        console.log('No data file selected');
        uploadValid = false;
        uploadErrors = { ...uploadErrors, fileUpload: res.locals.text.VALIDATION.FILE_UPLOAD.FILE_REQUIRED };
        file.resume();
        return;
      }

      console.log(`[on-File] Start processing file upload: ${uploadDetails.fileName}`);


      // Upload file to container -  + uuidv4() + '.txt'
      /*
      const dataBlobName = `${uploadDetails.dataFileFolder}/${uploadDetails.fileName}_data.txt`;
      const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(dataBlobName);
      const bufferSize = 4 * 1024 * 1024;
      const maxConcurrency = 5;
      const uploadOptions = {
        bloblHTTPHeaders: { blobContentType: mimetype || 'application/octet-stream' },
      }
      await blockBlobClient.uploadStream(file, bufferSize, maxConcurrency, uploadOptions);
      */

      //console.log('uploaded to azure');

      file.resume();
      
      // handle file too large error
      file.on('limit', () => {
        fileTooLarge = true;
        file.resume();
        console.log('File size exceeds maximum limit during upload');
      });
      
      // handle incoming file chunks
      file.on('data', (data: Buffer) => {
        console.log(`Received ${data.length} bytes`);
        fileChunks.push(data);
        uploadFileSize += data.length;
      });
      
      
      file.on('end', () => {
        uploadDetails.fileSize = uploadFileSize;

        fileBuffer = Buffer.concat(fileChunks);
        fileChunks.length = 0; // Clear the chunks array - free memory
        console.log(`Finished receiving file: ${uploadDetails}`);
        console.log(`Total file size in buffer: ${fileBuffer.length} bytes`);
      });

    });

    // ToDo: add error handling for upload processing
    bb.on('error', (err: any) => {
      console.log('Error processing file upload: ', err);
      return res.status(500).send('Error processing file upload');
    });

    bb.on('finish', async () => {

      console.log('Finished processing upload form and data');

      //uploadErrors = validateDetails(uploadDetails, res.locals.text.VALIDATION);

      if (fileTooLarge) {
        uploadErrors = { ...uploadErrors, fileUpload: res.locals.text.VALIDATION.FILE_UPLOAD.FILE_TOO_LARGE };
      }

      if (Object.keys(uploadErrors).length > 0) {
        console.log('Form validation errors: ', uploadErrors);
        req.session.errors = _.clone(uploadErrors);
        uploadValid = false;
      }

      if (!uploadValid) {

        req.session.errors = _.clone(uploadErrors);

        console.log('Upload validation failed - redirecting back to form');
        console.log('Errors: ' + JSON.stringify(req.session.errors));

        req.destroy();
        
        return res.redirect('/data-upload');

      } else {

        console.log('Upload validation ok - upload files to blob storage');

        console.log('Upload metadata file to blob storage');
        await createAzureMetadataFile(uploadDetails);

        //console.log('Upload data file to blob storage');
        //await createAzureMetadataFile(uploadDetails);



      }

      req.unpipe(bb);
      bb.removeAllListeners();
      req.destroy();
      return res.redirect('/data-upload');

    });

    req.pipe(bb);

    if (!uploadValid) {
      app.logger.info('Upload validation failed - redirecting back to form');
      
      req.session.errors = _.clone(uploadErrors);
      app.logger.info('Errors: ' + JSON.stringify(req.session.errors));

      return res.redirect('/data-upload');

    } else {
      app.logger.info('Upload validation passed - upload files to blob storage');
    }

    app.logger.info('End of controller - re-disply upload form');

    return res.render('data-upload/data-upload.njk', {
      fileUploadPostUrl: '/data-upload',
      deadlineValue: '31 March 2026',
      daysRemainingValue: 83,
      statusVal: 'Uploaded',
      fileFormats: fileformats
    });

  });


  function sanitizeFilename(name = '') {
    return name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\.]/g, '');
  }

  const validateDetails = 
  (uploadDetails: UploadDetails, messageText: any) => {
    
    let uploadErrors: { [key: string]: string } = {}; //{ initError: 'error initvalue' };
    //let uploadErrors: any = {};

    
    let arrErrors: any = [];

    if (!uploadDetails.fileName) {
      uploadErrors['fileUpload'] = messageText.FILE_UPLOAD.FILE_REQUIRED;
      arrErrors.push({ field: 'fileUpload', message: messageText.FILE_UPLOAD.FILE_REQUIRED });
    }

    if (!uploadDetails.fileFormat) {
      uploadErrors['fileFormat'] = messageText.FILE_UPLOAD.FILE_FORMAT_REQUIRED;
      arrErrors.push({ field: 'fileFormat', message: messageText.FILE_UPLOAD.FILE_FORMAT_REQUIRED });
    }

    if (!uploadDetails.citizensOverAge) {
      uploadErrors['citizensOverageYes'] = messageText.FILE_UPLOAD.CITIZENS_OVER_AGE_REQUIRED;
      arrErrors.push({ field: 'citizensOverageYes', message: messageText.FILE_UPLOAD.CITIZENS_OVER_AGE_REQUIRED });
    }
    

    //uploadErrors = new Map(arrErrors.map((obj: any) => [obj.field, obj.message]));

    return uploadErrors;  
  };

  async function createAzureMetadataFile (uploadDetails: UploadDetails) {

    const currentDate = new Date();

    console.log('Creating metadata file: ', uploadDetails);

    let fileData: string = '';
    fileData += `LA Name: ${uploadDetails.laName}\n`;
    fileData += `Format: ${uploadDetails.fileFormat}\n`;
    
    fileData += `Over 76: ${uploadDetails.citizensOverAge}\n`;
    fileData += `Other Flags: ${uploadDetails.electorTypes.join(', ')}\n`;
    fileData += `Other Information: ${uploadDetails.otherInformation}\n`;
    fileData += `\n`;
    fileData += `User Name: ${uploadDetails.userName}\n`;
    fileData += `User Email: ${uploadDetails.userEmail}\n`;
    fileData += `Upload date: ${currentDate.toISOString()}`;

    try {

      /*
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING as string; 
      if (!connectionString) throw Error('AZURE_STORAGE_CONNECTION_STRING not found');

      const blobServiceClient = BlobServiceClient.fromConnectionString(
        connectionString
      );

      console.log('Uploading to Blob storage using connection string...');

      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME as string; 
      const containerClient = blobServiceClient.getContainerClient(containerName);

      */


      // Verify container exists
      //const exists = await containerClient.exists();
      //if (!exists) {
      //  throw new Error(`Container "${containerName}" does not exist.`);
      //}

      // Upload file to container -  + uuidv4() + '.txt'
      const blobName = `${uploadDetails.metadataFolder}/${uploadDetails.fileName}_metadata.txt`;
      const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName);

      console.log(
        `\nUploading to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`
      );
      const data = 'Test ER Portal data - test upload to blobl storage';
      const uploadBlobResponse: BlockBlobUploadResponse = await blockBlobClient.upload(fileData, fileData.length);
      console.log(
        `Blob data was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`
      );

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
    }

    return;
  };

  async function createAzureDataFile (uploadDetails: UploadDetails, fileBuffer: Buffer) {

    console.log('Creating data file with data: ', uploadDetails.fileName);
    app.logger.info('Creating data file with data: ', uploadDetails.fileName);

    try {

      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING as string; 
      if (!connectionString) throw Error('AZURE_STORAGE_CONNECTION_STRING not found');

      const blobServiceClient = BlobServiceClient.fromConnectionString(
        connectionString
      );

      console.log('Uploading data to Blob storage using connection string...');

      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME as string; 
      const containerClient = blobServiceClient.getContainerClient(containerName);
      // Verify container exists
      const exists = await containerClient.exists();
      if (!exists) {
        throw new Error(`Container "${containerName}" does not exist.`);
      }

      // Upload file to container -  + uuidv4() + '.txt'
      const dataBlobName = `${uploadDetails.dataFileFolder}/${uploadDetails.fileName}_data.txt`;
      const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(dataBlobName);

      console.log(
        `\nUploading to Azure storage as blob\n\tname: ${dataBlobName}:\n\tURL: ${blockBlobClient.url}`
      );

      const uploadBlobResponse: BlockBlobUploadResponse = await blockBlobClient.upload(fileBuffer, fileBuffer.length);
      console.log(
        `Blob data was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`
      );

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
    }

    return;
  };

}
