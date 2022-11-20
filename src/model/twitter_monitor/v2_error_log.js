import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class V2ErrorLog extends Model {}

const attributes = {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    comment: '',
    field: 'id'
  },
  uid: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'uid'
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'name'
  },
  code: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'code'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'message'
  },
  timestamp: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'timestamp'
  }
};
const options = {
  modelName: 'v2_error_log',
  tableName: 'v2_error_log', 
  sequelize: dbHandle.twitter_monitor,
  indexes: [{
    name: 'timestamp',
    unique: false,
    using: 'BTREE',
    fields: ['timestamp']
  }, {
    name: 'uid',
    unique: false,
    using: 'BTREE',
    fields: ['uid']
  }, {
    name: 'code',
    unique: false,
    using: 'BTREE',
    fields: ['code']
  }]
};
V2ErrorLog.init(attributes, options);
export default V2ErrorLog;