import moment from 'moment';
import path from 'path';

export const LoggerConfig = {
  /**
   * Diretório pardrão de logs
   * @date 24/03/2023 - 20:19:18
   *
   */
  path: path.resolve(
    __dirname,
    '../../../logs',
    moment().format('DD-MM-YYYY'),
    moment().format('HH_mm')
  ),

  /**
   * Formato de saída dos arquivos de logs
   * @date 24/03/2023 - 20:19:18
   *
   */
  fileformat: '.json',

  /**
   * Nível do logger
   */
  level: process.env.LOGGER_LEVEL || 'info',

  /**
   * Transportar logs para o console do prompt
   * @date 24/03/2023 - 20:19:18
   *
   */
  console: !!parseInt(process.env.LOGGER_CONSOLE) || false
};
