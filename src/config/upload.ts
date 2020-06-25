import multer from 'multer';
import crypto from 'crypto';
import path from 'path';

const tmpfolder = path.resolve(__dirname, '..', '..', 'tmp');
export default {
  // armazernar dentro da aplicação
  // quando a aplicação for crescendo usar algum servidor
  directory: tmpfolder,
  storage: multer.diskStorage({
    destination: tmpfolder,
    filename(request, file, callback) {
      const fileHash = crypto.randomBytes(10).toString('hex');
      const fileName = `${fileHash}-${file.originalname}`;
      return callback(null, fileName);
    },
  }),
};
