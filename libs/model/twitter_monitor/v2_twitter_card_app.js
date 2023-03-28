import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class V2TwitterCardApp extends Model {}

const attributes = {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    comment: '',
    field: 'id'
  },
  tweet_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'tweet_id'
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
  unified_card_type: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'unified_card_type'
  },
  type: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'type'
  },
  appid: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'appid'
  },
  country_code: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'country_code'
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'title'
  },
  category: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'category'
  }
};
const options = {
  modelName: 'v2_twitter_card_app',
  tableName: 'v2_twitter_card_app', 
  sequelize: dbHandle.twitter_monitor,
  indexes: [{
    name: 'tweet_id',
    unique: false,
    using: 'BTREE',
    fields: ['tweet_id']
  }, {
    name: 'uid',
    unique: false,
    using: 'BTREE',
    fields: ['uid']
  }]
};
V2TwitterCardApp.init(attributes, options);
export default V2TwitterCardApp;