import moment from 'moment';

export type level = 'info' | 'danger' | 'warning' | 'success' | 'especial' | 'comment' | 'normal';
export class Console {
  static log(msg: string, level: level = 'normal') {
    let color = '0m';
    if (!msg) return;
    switch (level) {
      case 'info':
        color = '94m';
        break;
      case 'danger':
        color = '91m';
        break;
      case 'warning':
        color = '33m';
        break;
      case 'success':
        color = '92m';
        break;
      case 'especial':
        color = '95m';
        break;
      case 'comment':
        color = '97m';
        break;
    }
    console.log(`\x1b[97m[%s]\x1b[${color} %s\x1b[0m`, moment().format('HH:mm:ss'), msg);
  }
}
