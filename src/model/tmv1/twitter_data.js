import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class TwitterData extends Model {}

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
  display_name: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'display_name'
  },
  following: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'following'
  },
  followers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'followers'
  },
  media_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'media_count'
  },
  statuses_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'statuses_count'
  },
  timestamp: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'timestamp'
  }
};
const options = {
  modelName: 'twitter_data',
  tableName: 'twitter_data',
  sequelize: dbHandle.tmv1,
  indexes: [{
    name: 'uid',
    unique: false,
    using: 'BTREE',
    fields: ['uid']
  }]
};
TwitterData.init(attributes, options);
export default TwitterData;