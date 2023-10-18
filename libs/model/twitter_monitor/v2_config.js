import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class V2Config extends Model {}

const attributes = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    comment: '',
    field: 'id',
    unique: 'id'
  },
  data_original: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'data_original'
  },
  data_output: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'data_output'
  },
  md5: {
    type: DataTypes.CHAR(32),
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'md5'
  },
  timestamp: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'timestamp'
  }
};
const options = {
  modelName: 'v2_config',
  tableName: 'v2_config', 
  sequelize: dbHandle.twitter_monitor,
  indexes: []
};
V2Config.init(attributes, options);
export default V2Config;