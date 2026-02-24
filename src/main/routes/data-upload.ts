import { Application } from 'express';
import * as _ from 'lodash';
import path from 'path';
import busboy from 'busboy';
import { verify } from '../modules/auth';
import { uploadStatusDAO } from '../objects/upload';
import { uploadDashboardDAO } from '../objects/upload';
import { uploadStatusUpdateDAO } from '../objects/upload';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import 'dotenv/config'

import { BlobServiceClient, 
        ContainerCreateResponse, 
        BlockBlobClient, 
        BlockBlobUploadResponse, 
        ContainerDeleteResponse, 
        BlobDownloadResponseParsed, 
        ContainerClient} from '@azure/storage-blob';

export class UploadDetails {
  laCode: string = '';
  laName: string = '';
  userName: string = '';
  userEmail: string = '';
  citizensOverAge: string = '';
  dataFormat: string = '';
  electorTypes: string[] = [];
  otherInformation: string = '';
  fileName: string = '';
  fileSize: number = 0;
  fileExtension: string = '';
  fileMimeType: string = '';
  uploadedFileSize: number = 0;
  dataFileFolder: string = '';
  metadataFolder: string = '';
  metadataBlobFilePath: string = '';
  dataBlobFilePath: string = '';
  fileUploadSuccessful: boolean = false;
  metadataUploadSuccessful: boolean = false;
}
export class UploadFormData {
  dataFormat: string = '';
  citizensOverAge: string = '';
  fileName: string = '';
  electorTypes: string = '';
  otherInformation: string = '';  
}

export default function (app: Application): void {

  const dataFormats = [
    { value: '', text: 'Select a format' },
    { value: 'Express', text: 'Express' },
    { value: 'Strand', text: 'Strand' },
    { value: 'Halarose', text: 'Halarose' },
    { value: 'Xpress software solutions', text: 'Xpress software solutions' },
    { value: 'Other compatible formats', text: 'Other' },
  ];

  const acceptedFileTypes = ['.csv', '.txt', '.xlsx', '.xlsm', '.xls', '.xltx', '.xltm', '.zip'];
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  let connectionString = '';
  let containerName = '';
  let blobServiceClient: BlobServiceClient;
  let containerClient: ContainerClient
    
 
  app.get('/data-upload', verify, async (req, res) => {

      const tmpErrors = _.clone(req.session.errors);
      const formData = _.clone(req.session.formFields);
      delete req.session.errors;
      delete req.session.formFields;

      let bannerMessage: string = '';
      if (req.session.bannerMessage) {
        bannerMessage = req.session.bannerMessage;
        delete req.session.bannerMessage;
      };

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
      
      const uploadDeadlineDate = new Date(dashboardDetails.deadlineDate)
      const displayDeadlineDate = uploadDeadlineDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const daysRemaining = dashboardDetails.daysRemaining;
      const uploadStatus = dashboardDetails.uploadStatus;
      const uploadWindowClosed = uploadDeadlineDate < new Date();

      if (uploadWindowClosed) {
        return res.redirect('data-upload-closed');
      }

      return res.render('data-upload/data-upload.njk', {
        deadlineDate: displayDeadlineDate,
        daysRemaining: daysRemaining,
        uploadStatus: uploadStatus,
        dataFormats: dataFormats,
        fileUploadPostUrl: '/submit-data-upload',
        fileTypes: acceptedFileTypes,
        bannerMessage: bannerMessage,
        formData: formData,
        errors: tmpErrors
      });
  });


  app.get('/data-upload-closed', verify, (req, res) => {
    
    res.render('data-upload/data-upload-closed.njk', {
      deadlineValue: ''
    });
    
  });


  app.post('/submit-data-upload', async (req, res, next:any) => {

    const uploadDetails: UploadDetails = new UploadDetails();
    //const uploadMetadata: UploadMetadata = new UploadMetadata();

    let fileStream: NodeJS.ReadableStream | null = null;
    let uploadAborted = false;
    let fileTooLarge: boolean = false;
    let uploadValid: boolean = true;
    let uploadErrors: { [key: string]: string } = {};
    let metadataReceived = false;

    delete req.session.errors;
    delete req.session.formFields;

    uploadDetails.laCode = req.session?.authentication?.laCode || '';
    uploadDetails.laName = req.session?.authentication?.laName || '';
    uploadDetails.userName = req.session?.authentication?.username || '';
    uploadDetails.userEmail = req.session?.authentication?.userEmail || '';

    // Set azure storage folder names for data and metadata
    const currentDate = new Date();
    const dateFolder = currentDate.toISOString().slice(0,10).replace(/-/g,"");
    uploadDetails.metadataFolder = `${dateFolder}/LA_Data/${uploadDetails.laCode}-${uploadDetails.laName}`;
    uploadDetails.dataFileFolder = `${dateFolder}/LA_Data/${uploadDetails.laCode}-${uploadDetails.laName}`;

    //const formData: UploadFormData = new UploadFormData();
    let formData = {
      dataFormat: '',
      citizensOverAge: '',
      fileName: '',
      electorTypes: '',
      otherInformation: ''
    }

    // Configure azure container client
    try {
      connectionString = process.env.AZURE_STORAGE_CONNECTION_STRINGX as string; 
      if (!connectionString) throw new Error('Azure connection string not found');

      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      containerName = process.env.AZURE_STORAGE_CONTAINER_NAME as string; 
      containerClient = blobServiceClient.getContainerClient(containerName);

      // Verify container exists
      /*
      const exists = await containerClient.exists();
      if (!exists) {
        throw new Error(`Container "${containerName}" does not exist.`);
      }
      */


    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      uploadValid = false;
      app.logger.crit(`Error configuring Azure Container Client: ${message}`, {
        auth: req.session.authentication,
        error: typeof err.error !== 'undefined' ? err.message : err.toString(),
      });

      return res.render('_errors/generic', { 'Error configuring Azure Container Client': message });
    }

    const bb = busboy({ 
      headers: req.headers, 
      limits: { fileSize: MAX_FILE_SIZE }
    });


    // Process form fields
    bb.on('field', (fieldname: string, val: string) => {

      //console.log(`[on Field] Field received fieldname: ${fieldname}  value: ${val}`);

      val = val.trim();

      if (fieldname === 'fileSizeVal' && val) {
        try{
        uploadDetails.fileSize = parseInt(val, 10);
        } catch (e) {
          console.log('Error parsing fileSizeVal: ', e);
        }
      }

      if (!uploadDetails.dataFormat){
        if (fieldname === 'dataFormat' || fieldname === 'dataFormatVal') {
          uploadDetails.dataFormat = val;
          formData.dataFormat = val;
          
        }
      }
      
      if (!uploadDetails.citizensOverAge) {
        if (fieldname === 'citizensOverAge' || fieldname === 'citizensOverAgeVal') {
          uploadDetails.citizensOverAge = val;
          formData.citizensOverAge = val;
        }
      }

      if (fieldname === 'electorType') {
        uploadDetails.electorTypes.push(val);
      }
      if (fieldname === 'electorTypesVal') {
        uploadDetails.electorTypes = val.split(',').map((s) => s.trim());
        formData.electorTypes = val;
      }

      if (fieldname === 'otherInformation' || fieldname === 'otherInformationVal') {
        uploadDetails.otherInformation = val;
        formData.otherInformation = val;
      }

      if (fieldname === 'filename') {
        uploadDetails.fileName = val;
        
        formData.fileName = val;
      }

      metadataReceived = true;
      
    });

    // Process file upload
    bb.on('file', async (fieldname: string, file: NodeJS.ReadableStream, fileInfo: any, encoding: string, mimetype: string) => {

      if (uploadAborted || fileStream) {
        // If upload aborted or have an active stream, drain the incoming file stream return early 
        console.log('[on File] Upload aborted or file stream active - draining incoming file stream ');
        try {
          (file as any).resume();
        } catch (e) {}
        return;
      }

      console.log(`[on File] filename: ${fileInfo.filename}`);

      if (!fileInfo.filename) {
        console.log('[on File] No file uploaded (empty filename) - skipping file processing');
        uploadValid = false;
        uploadDetails.fileName = '';
        uploadDetails.fileMimeType = '';
        uploadDetails.fileExtension = '';
      } else {
        uploadDetails.fileName = fileInfo.filename.trim();
        uploadDetails.fileMimeType = fileInfo.mimeType;
        uploadDetails.fileExtension = path.extname(fileInfo.filename).toLowerCase();
      }

      uploadErrors = validateDetails(uploadDetails, res.locals.text.VALIDATION);

      if (Object.keys(uploadErrors).length > 0) {
        //console.log('Form validation errors: ', uploadErrors);
        req.session.errors = _.clone(uploadErrors);
        uploadValid = false;
      }

      if (!uploadValid) {
        // If upload invalid drain the incoming file stream return early 
        try {
          (file as any).resume();
        } catch (e) {}
        return;
      }


      // Form valid, proceed with upload to Azure
      if (uploadValid){
        fileStream = file;

        const dataBlobName = `${uploadDetails.dataFileFolder}/${uploadDetails.fileName}`;
        const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(dataBlobName);
        const bufferSize = 2 * 1024 * 1024; // 2MB buffer size for streaming upload 
        const maxConcurrency = 5; // max concurrency for parallel uploads
        const uploadOptions = {
          blobHTTPHeaders: {
            blobContentType: uploadDetails.fileMimeType || 'application/octet-stream',
          },
        };

        console.log(`[on-File] Start upload to azure: ${uploadDetails.fileName} ...`);
        

        try{

          app.logger.info('Upload data file to azure', {
            laCode: req.session.authentication?.laCode,
            fileName: uploadDetails.fileName
          });
          // Stream upload directly to Azure storage
          await blockBlobClient.uploadStream(file as unknown as Readable, bufferSize, maxConcurrency, uploadOptions);
          
          uploadDetails.fileUploadSuccessful = true;

          app.logger.info('Data file upload successful', {
          laCode: req.session.authentication?.laCode,
          fileName: dataBlobName,
          blobUrl: blockBlobClient.url
        });

        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          app.logger.crit(`Error uploading file to Azure Blob Storage: ${message}`, {
            auth: req.session.authentication,
            error: typeof err.error !== 'undefined' ? err.message : err.toString(),
          });
          uploadAborted = true;
        }

        console.log(`[on File] Uploaded to Azure storage as blob\n\tname: ${dataBlobName}:\n\tURL: ${blockBlobClient.url}`);
        

      }
     
      // handle file too large error
      file.on('limit', () => {
        console.log('File size exceeds maximum limit during upload');
        fileTooLarge = true;
        uploadAborted = true;
        file.resume();
      });
      
      // handle incoming file chunks
      file.on('data', (data: Buffer) => {
        uploadDetails.uploadedFileSize += data.length;
        //console.log(`[on Data] Received: ${data.length} bytes,  total processed: ${uploadDetails.uploadedFileSize} bytes`);
      });
      
      file.on('end', () => {
        //fileBuffer = Buffer.concat(fileChunks);
        //fileChunks.length = 0; // Clear the chunks array - free memory
        console.log(`[on End] Finished receiving file: ${uploadDetails}`);
      });

    });

    bb.on('error', (err: any) => {
      const message = err instanceof Error ? err.message : String(err);
      console.log('Error processing file upload: ', err);
      return res.render('_errors/generic', { 'Error processing file upload: ': message });
    });

    bb.on('finish', async () => {

      app.logger.info('Finished processing form and data', {
        laCode: req.session.authentication?.laCode
      });

      if (Object.keys(uploadErrors).length > 0) {
        console.log('Form validation errors: ', uploadErrors);
        req.session.errors = _.clone(uploadErrors);
        uploadValid = false;
      }

      if (!uploadValid) {

        req.session.errors = _.clone(uploadErrors);
        req.session.formFields = _.clone(formData);

        console.log('[on Finish] Upload validation failed - redirecting back to form');
        console.log('[on Finish] Errors: ' + JSON.stringify(req.session.errors));

        req.destroy();
        
        return res.redirect('/data-upload');

      } else {

        console.log('[on Finish] Upload validation ok - upload files to blob storage');
        console.log('Upload metadata file to blob storage');
        await createAzureMetadataFile(req, containerClient, uploadDetails);

        req.session.bannerMessage = 'File upload successful';

      }

      // Call API to update LA upload status
      let statusDetails;
      let dashboardDetails;
      

      try {
        let payload = {
          filename: uploadDetails.fileName,
          file_format: uploadDetails.dataFormat,
          file_size_bytes: uploadDetails.fileSize,
          other_information: uploadDetails.otherInformation
        }

        const apiResponse = await uploadStatusUpdateDAO.post(app, req.session.authToken, payload);

        } catch (err) {
          app.logger.crit('Failed to update upload status', {
            error: typeof err.error !== 'undefined' ? err.error : err.toString(),
          });
      }

      req.unpipe(bb);
      bb.removeAllListeners();
      req.destroy();
      return res.redirect('/data-upload');

    });

    req.pipe(bb);

    function abortWithRedirect(url = '/data-upload') {
      console.log('abortWithRedirect...');

      if (uploadAborted) return;
      uploadAborted = true;

      // Stop busboy and remove listeners so nothing else runs
      try {
        req.unpipe(bb);
      } catch (e) {}
      try {
        bb.removeAllListeners();
      } catch (e) {}

      const destroySocketAfterResponse = () => {
        try {
          req.socket && req.socket.destroy();
        } catch (e) {}
      };

      if (!res.headersSent) {
        // Destroy socket after Node emits 'finish' (response flushed)
        res.once('finish', destroySocketAfterResponse);
        try {
          res.writeHead(303, { Location: url, Connection: 'close' });
          res.end(); // do NOT pass a callback here (express-session wraps res.end)
        } catch (e) {
          console.error('Error while sending redirect:', e);
          // fallback immediate destroy
          destroySocketAfterResponse();
        }
      } else {
        // headers already sent -> best-effort cleanup
        destroySocketAfterResponse();
      }
    };


  });

  
  function sanitizeFilename(name = '') {
    return name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\.]/g, '');
  };

  function validateDetails(uploadDetails: UploadDetails, messageText: any) {
    
    let uploadErrors: { [key: string]: string } = {};
    
    //console.log('Validating upload details: ', uploadDetails);

    if (!uploadDetails.fileName) {
      uploadErrors['fileUpload'] = messageText.FILE_UPLOAD.FILE_REQUIRED;
    }

    if (uploadDetails.fileExtension){
      if (!acceptedFileTypes.includes(uploadDetails.fileExtension)) {
        uploadErrors['fileUpload'] = messageText.FILE_UPLOAD.INVALID_FILE_TYPE;
      }
    }

    if (uploadDetails.fileSize > MAX_FILE_SIZE) {
      uploadErrors['fileUpload'] = messageText.FILE_UPLOAD.FILE_TOO_LARGE;
    }

    if (!uploadDetails.dataFormat) {
      uploadErrors['dataFormat'] = messageText.FILE_UPLOAD.DATA_FORMAT_REQUIRED;
    }

    if (!uploadDetails.citizensOverAge) {
      uploadErrors['citizensOverAgeYes'] = messageText.FILE_UPLOAD.CITIZENS_OVER_AGE_REQUIRED;
    }

    if (!uploadDetails.otherInformation && uploadDetails.electorTypes.length > 200) {
      uploadErrors['otherInformation'] = messageText.FILE_UPLOAD.OTHER_INFORMATION_TOO_LONG;
    }
    
    return uploadErrors;  
  };

  async function createAzureMetadataFile (req: any, containerClient: ContainerClient, uploadDetails: UploadDetails) {

    const currentDate = new Date();


    let fileData: string = '';

    try {

      app.logger.info('Creating metadata file ', {
        laCode: req.session.authentication?.laCode,
        fileName: uploadDetails.fileName
      });
      fileData += `LA Name: ${uploadDetails.laName}\n`;
      fileData += `Format: ${uploadDetails.dataFormat}\n`;
      fileData += `Over 76: ${uploadDetails.citizensOverAge}\n`;
      fileData += `Other Flags: ${uploadDetails.electorTypes}\n`;
      fileData += `Other Information: ${uploadDetails.otherInformation}\n`;
      fileData += `\n`;
      fileData += `User Name: ${uploadDetails.userName}\n`;
      fileData += `User Email: ${uploadDetails.userEmail}\n`;
      fileData += `Upload date: ${currentDate.toISOString()}`;

      

      // Upload file to Azure container
      const blobName = `${uploadDetails.metadataFolder}/${uploadDetails.fileName}_metadata.txt`;
      const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName);

      app.logger.info('Uploading metadata file to azure', {
        laCode: req.session.authentication?.laCode,
        fileName: blobName
      });

      const uploadBlobResponse: BlockBlobUploadResponse = await blockBlobClient.upload(fileData, fileData.length);
      
      app.logger.info('Metadata file uploadsuccessful', {
        laCode: req.session.authentication?.laCode,
        fileName: blobName
      });

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

      // Upload file to container
      const dataBlobName = `${uploadDetails.dataFileFolder}/${uploadDetails.fileName}`;
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
