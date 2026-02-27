import path from 'path';
import { Readable } from 'stream';

import { BlobServiceClient, BlockBlobClient, ContainerClient } from '@azure/storage-blob';
import busboy, { FileInfo } from 'busboy';
import config from 'config';
import csrf from 'csurf';
import { Application } from 'express';
import * as _ from 'lodash';

import { verify } from '../modules/auth';
import { uploadDashboardDAO, uploadStatusUpdateDAO } from '../objects/upload';
import 'dotenv/config';

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
  uploadBytesReceived: number = 0;
  azureDataFolder: string = '';
  azureMetadataFolder: string = '';
  azureDataFilepath: string = '';
  azureMetadataFilepath: string = '';
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

  const csrfProtection = csrf({ cookie: true });

  app.get('/data-upload', csrfProtection, verify, async (req, res) => {
    const tmpErrors = _.clone(req.session.errors);
    const formData = _.clone(req.session.formFields);
    delete req.session.errors;
    delete req.session.formFields;

    let bannerMessage: { type: string; message: string } | undefined = undefined;
    if (req.session.bannerMessage) {
      bannerMessage = req.session.bannerMessage;
      delete req.session.bannerMessage;
    }

    // Call API to get dashboard details
    let dashboardDetails;
    try {
      dashboardDetails = await uploadDashboardDAO.get(app, req.session?.authToken);
    } catch (err) {
      app.logger.crit('Failed to fetch dashboard details: ', {
        error: typeof err.error !== 'undefined' ? err.error : err.toString(),
        laCode: req.session?.authentication?.laCode,
      });
      return res.render('_errors/generic', { err });
    }

    // Check deadline date / upload window closed
    let displayDeadlineDate = '';
    let daysRemaining;
    let uploadDeadlineDate;
    let uploadWindowClosed = true;

    if (dashboardDetails && dashboardDetails.deadlineDate) {
      uploadDeadlineDate = new Date(dashboardDetails.deadlineDate);
      displayDeadlineDate = uploadDeadlineDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      daysRemaining = dashboardDetails.daysRemaining;
      // days remaining is 0 on last day of upload window (when deadline date = current date)
      uploadWindowClosed = daysRemaining < 0;
    } else {
      app.logger.crit('Error processing upload dashboard details: ', {
        dashboardDetails,
        laCode: req.session?.authentication?.laCode,
      });
    }

    if (uploadWindowClosed) {
      return res.redirect('data-upload-closed');
    }

    return res.render('data-upload/data-upload.njk', {
      deadlineDate: displayDeadlineDate,
      daysRemaining,
      uploadStatus: dashboardDetails?.uploadStatus,
      dataFormats,
      fileUploadPostUrl: '/submit-data-upload',
      fileTypes: acceptedFileTypes,
      bannerMessage,
      formData,
      csrftoken: req.csrfToken(),
      errors: tmpErrors,
    });
  });

  app.get('/data-upload-closed', verify, (req, res) => {
    delete req.session.errors;
    delete req.session.formFields;

    res.render('data-upload/data-upload-closed.njk', {
      deadlineDate: '',
    });
  });

  app.post('/submit-data-upload', async (req, res) => {
    const uploadDetails: UploadDetails = new UploadDetails();

    let connectionString = '';
    let containerName = '';
    let blobServiceClient: BlobServiceClient;
    let containerClient: ContainerClient;
    let blockBlobClient: BlockBlobClient;

    let fileStream: NodeJS.ReadableStream | null = null;
    let uploadAborted = false;
    let uploadValid: boolean = true;
    let uploadErrors: { [key: string]: string } = {};

    delete req.session.errors;
    delete req.session.formFields;
    delete req.session.bannerMessage;

    uploadDetails.laCode = req.session?.authentication?.laCode || '';
    uploadDetails.laName = req.session?.authentication?.laName || '';
    uploadDetails.userName = req.session?.authentication?.username || '';
    uploadDetails.userEmail = req.session?.authentication?.username || '';

    // Set azure storage folder names for data and metadata
    const currentDate = new Date();
    const dateFolder = currentDate.toISOString().slice(0, 10).replace(/-/g, '');
    uploadDetails.azureMetadataFolder = `${dateFolder}/LA_Data/${uploadDetails.laCode}-${uploadDetails.laName}/${uploadDetails.laName}`;
    uploadDetails.azureDataFolder = `${dateFolder}/LA_Data/${uploadDetails.laCode}-${uploadDetails.laName}`;

    //const formData: UploadFormData = new UploadFormData();
    const formData = {
      dataFormat: '',
      citizensOverAge: '',
      fileName: '',
      electorTypes: '',
      otherInformation: '',
    };

    app.logger.info('Received data upload request', {
      laCode: uploadDetails.laCode,
      laName: uploadDetails.laName,
      userName: uploadDetails.userName,
      userEmail: uploadDetails.userEmail,
    });

    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE },
    });

    // Process form fields
    bb.on('field', (fieldname: string, val: string) => {
      val = val.trim();

      if (fieldname === 'fileSizeVal' && val) {
        try {
          uploadDetails.fileSize = parseInt(val, 10);
        } catch (err) {
          app.logger.crit('Error parsing fileSize value: ', {
            Error: err,
            fieldValue: val,
            laCode: req.session?.authentication?.laCode,
          });
        }
      }

      if (!uploadDetails.dataFormat) {
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
        if (!_.includes(uploadDetails.electorTypes, val)) {
          uploadDetails.electorTypes.push(val);
        }
      }
      if (fieldname === 'electorTypesVal') {
        uploadDetails.electorTypes = val.split(',').map(s => s.trim());
        formData.electorTypes = val;
      }

      if (fieldname === 'otherInformation' || fieldname === 'otherInformationVal') {
        uploadDetails.otherInformation = val;
        formData.otherInformation = val;
      }

      if (fieldname === 'filename') {
        uploadDetails.fileName = sanitizeFilename(val);
        formData.fileName = sanitizeFilename(val);
      }
    });

    // Process file upload
    bb.on('file', async (_fieldname: string, file: NodeJS.ReadableStream, fileInfo: FileInfo) => {
      if (uploadAborted || fileStream) {
        // If upload aborted or have an active stream, drain the incoming file stream return early
        app.logger.warn('Upload aborted or file stream active - draining incoming file stream', {
          laCode: req.session?.authentication?.laCode,
          fileName: fileInfo.filename,
          fileStreamActive: !!fileStream,
        });
        try {
          file.resume();
        } catch (err) {
          app.logger.crit('Error draining incoming file stream: ', {
            laCode: req.session?.authentication?.laCode,
            fileName: fileInfo.filename,
            error: err,
          });
        }
        return;
      }

      if (!fileInfo.filename) {
        app.logger.warn('No file details received: ', {
          laCode: req.session?.authentication?.laCode,
          fileName: fileInfo.filename,
        });
        uploadValid = false;
        uploadDetails.fileName = '';
        uploadDetails.fileMimeType = '';
        uploadDetails.fileExtension = '';
      } else {
        uploadDetails.fileName = fileInfo.filename.trim();
        uploadDetails.fileMimeType = fileInfo.mimeType;
        uploadDetails.fileExtension = path.extname(fileInfo.filename).toLowerCase();

        app.logger.info('Upload file details received: ', {
          laCode: req.session?.authentication?.laCode,
          fileName: fileInfo.filename,
          mimeType: fileInfo.mimeType,
        });
      }

      uploadErrors = validateDetails(uploadDetails, res.locals.text.VALIDATION);

      if (Object.keys(uploadErrors).length > 0) {
        req.session.errors = _.clone(uploadErrors);
        uploadValid = false;
      }

      if (!uploadValid) {
        // If upload invalid drain the incoming file stream return early
        try {
          file.resume();
        } catch (err) {
          app.logger.crit('Error draining incoming file stream: ', {
            laCode: req.session?.authentication?.laCode,
            fileName: fileInfo.filename,
            error: err,
          });
        }
        return;
      }

      // Upload details valid, proceed with upload to Azure blob storage
      if (uploadValid) {
        try {
          fileStream = file;

          // Configure azure container client
          connectionString = config.get('secrets.juror.er-portal-storage-connection-string') as string;
          if (!connectionString) {
            throw new Error('Azure connection string not found');
          } else {
            app.logger.info('Azure connection string retrieved');
          }

          containerName = process.env.AZURE_STORAGE_CONTAINER_NAME as string;
          if (!containerName) {
            throw new Error('Azure container name not found');
          } else {
            app.logger.info('Azure container name retrieved');
          }

          blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
          app.logger.info('Azure BlobServiceClient created: ', {
            url: blobServiceClient.url,
          });

          containerClient = blobServiceClient.getContainerClient(containerName);

          // Verify container exists
          app.logger.info('Checking if Azure container exists: ', {
            containerName,
          });
          const containerExists = await containerClient.exists();
          if (!containerExists) {
            throw new Error(`Container "${containerName}" does not exist.`);
          } else {
            app.logger.info('Azure container exists: ', {
              containerName,
            });
          }

          const bufferSize = 5 * 1024 * 1024; // 5MB buffer size for streaming upload
          const maxConcurrency = 5; // max concurrency for parallel uploads
          const uploadOptions = {
            blobHTTPHeaders: {
              blobContentType: uploadDetails.fileMimeType || 'application/octet-stream',
            },
          };
          uploadDetails.azureDataFilepath = `${uploadDetails.azureDataFolder}/${uploadDetails.fileName}`;
          const dataBlobName = uploadDetails.azureDataFilepath;
          blockBlobClient = containerClient.getBlockBlobClient(dataBlobName);
          app.logger.info('BlockBlobClient created: ', {
            url: blockBlobClient.url,
          });

          app.logger.info('Start upload data stream to azure: ', {
            laCode: req.session?.authentication?.laCode,
            fileName: uploadDetails.fileName,
            fileSize: uploadDetails.fileSize,
            mimeType: uploadDetails.fileMimeType,
            blobUrl: blockBlobClient.url,
          });
          // Stream upload directly to Azure storage
          await blockBlobClient.uploadStream(file as unknown as Readable, bufferSize, maxConcurrency, uploadOptions);

          uploadDetails.fileUploadSuccessful = true;
          req.session.bannerMessage = { type: 'success', message: 'File upload successful.' };

          app.logger.info('Data file upload successful: ', {
            laCode: req.session?.authentication?.laCode,
            fileName: uploadDetails.fileName,
            fileSize: uploadDetails.fileSize,
            mimeType: uploadDetails.fileMimeType,
            blobUrl: blockBlobClient.url,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          app.logger.crit('Error uploading file to Azure Blob Storage:', {
            error: message,
            laCode: req.session?.authentication?.laCode,
            filePath: uploadDetails.azureDataFilepath,
          });
          uploadAborted = true;
          uploadDetails.fileUploadSuccessful = false;
          req.session.bannerMessage = { type: 'error', message: 'File upload failed.' };
        }
      }

      // handle file too large error
      file.on('limit', () => {
        app.logger.crit('File size limit exceeded: ', {
          laCode: req.session?.authentication?.laCode,
          fileName: uploadDetails.fileName,
          mimeType: uploadDetails.fileMimeType,
          uploadBytesReceived: uploadDetails.uploadBytesReceived,
        });
        uploadAborted = true;
        uploadDetails.fileUploadSuccessful = false;
        file.resume();
      });

      // handle incoming file chunks
      file.on('data', (data: Buffer) => {
        uploadDetails.uploadBytesReceived += data.length;
      });

      file.on('end', () => {
        app.logger.info('Finished receiving file data: ', {
          laCode: req.session?.authentication?.laCode,
          fileName: uploadDetails.fileName,
          mimeType: uploadDetails.fileMimeType,
          uploadBytesReceived: uploadDetails.uploadBytesReceived,
        });
      });
    });

    bb.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);

      app.logger.crit('Error processing file upload: ', {
        error: message,
        laCode: req.session?.authentication?.laCode,
        fileName: uploadDetails.fileName,
        azureDataFilepath: uploadDetails.azureDataFilepath,
        mimeType: uploadDetails.fileMimeType,
        uploadBytesReceived: uploadDetails.uploadBytesReceived,
      });

      return res.render('_errors/generic', { 'Error processing file upload: ': message });
    });

    bb.on('finish', async () => {
      if (Object.keys(uploadErrors).length > 0) {
        req.session.errors = _.clone(uploadErrors);
        uploadValid = false;
      }

      if (!uploadValid) {
        req.session.errors = _.clone(uploadErrors);
        req.session.formFields = _.clone(formData);
        req.destroy();

        return res.redirect('/data-upload');
      } else {
        // create metadata file and upload to azure blob storage
        await createAzureMetadataFile(req, containerClient, uploadDetails);
      }

      try {
        const payload = {
          filename: uploadDetails.fileName,
          file_format: uploadDetails.dataFormat,
          file_size_bytes: uploadDetails.fileSize,
          other_information: uploadDetails.otherInformation,
        };

        await uploadStatusUpdateDAO.post(app, req.session.authToken, payload);
      } catch (err) {
        app.logger.crit('Failed to update upload status', {
          error: typeof err.error !== 'undefined' ? err.error : err.toString(),
          laCode: req.session?.authentication?.laCode,
          fileName: uploadDetails.fileName,
        });
      }

      return res.redirect('/data-upload');
    });

    req.pipe(bb);
  });

  function sanitizeFilename(name = '') {
    // eslint-disable-next-line no-useless-escape
    return name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-\.]/g, '');
  }

  function validateDetails(uploadDetails: UploadDetails, messageText: { [key: string]: { [key: string]: string } }) {
    const uploadErrors: { [key: string]: string } = {};

    if (!uploadDetails.fileName) {
      uploadErrors['fileUpload'] = messageText.FILE_UPLOAD.FILE_REQUIRED;
    }

    if (uploadDetails.fileExtension) {
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
  }

  async function createAzureMetadataFile(
    req: Express.Request,
    containerClient: ContainerClient,
    uploadDetails: UploadDetails
  ) {
    let fileData: string = '';

    uploadDetails.azureMetadataFilepath = `${uploadDetails.azureMetadataFolder}/${uploadDetails.fileName}_metadata.txt`;

    try {
      app.logger.info('Creating metadata file ', {
        laCode: req.session.authentication?.laCode,
        filePath: uploadDetails.azureMetadataFilepath,
      });

      const formattedDateTime = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      fileData += `LA Name: ${uploadDetails.laName}\n`;
      fileData += `Format: ${uploadDetails.dataFormat}\n`;
      fileData += `File Type: ${uploadDetails.fileExtension.slice(1)}\n`;
      fileData += `Over 76: ${uploadDetails.citizensOverAge}\n`;
      fileData += `Other Flags: ${uploadDetails.electorTypes}\n`;
      fileData += `Other Information: ${uploadDetails.otherInformation}\n`;
      fileData += '\n';
      fileData += `User Name: ${uploadDetails.userName}\n`;
      fileData += `User Email: ${uploadDetails.userEmail}\n`;
      fileData += '\n';
      fileData += `Date/Time: ${formattedDateTime}`;

      // Upload file to Azure container
      const blobName = uploadDetails.azureMetadataFilepath;
      const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(blobName);

      app.logger.info('Uploading metadata file to azure', {
        laCode: req.session.authentication?.laCode,
        fileName: blobName,
      });

      await blockBlobClient.upload(fileData, fileData.length);

      uploadDetails.metadataUploadSuccessful = true;

      app.logger.info('Metadata file upload successful', {
        laCode: req.session.authentication?.laCode,
        fileName: blobName,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      app.logger.crit('Failed to update upload status', {
        error: message,
        laCode: req.session?.authentication?.laCode,
        fileName: uploadDetails.fileName,
      });
    }

    return;
  }
}
