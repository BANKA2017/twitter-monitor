import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class V2ServerInfo extends Model {}

const attributes = {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    comment: '',
    field: 'id'
  },
  time: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'time'
  },
  microtime: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'microtime'
  },
  total_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'total_users'
  },
  total_tweets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'total_tweets'
  },
  total_req_tweets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'total_req_tweets'
  },
  total_throw_tweets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'total_throw_tweets'
  },
  total_req_times: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'total_req_times'
  },
  total_errors_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'total_errors_count'
  },
  total_media_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'total_media_count'
  },
  total_time_cost: {
    type: DataTypes.FLOAT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'total_time_cost'
  }
};
const options = {
  modelName: 'v2_server_info',
  tableName: 'v2_server_info', 
  sequelize: dbHandle.twitter_monitor,
  indexes: [{
    name: 'time',
    unique: false,
    using: 'BTREE',
    fields: ['time']
  }, {
    name: 'microtime',
    unique: false,
    using: 'BTREE',
    fields: ['microtime']
  }]
};
V2ServerInfo.init(attributes, options);
export default V2ServerInfo;