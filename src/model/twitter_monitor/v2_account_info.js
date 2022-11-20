import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class V2AccountInfo extends Model {}

const attributes = {
  id: {
    type: DataTypes.INTEGER,
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
    field: 'uid',
    unique: 'uid'
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'name'
  },
  display_name: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'display_name'
  },
  header: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'header'
  },
  banner: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'banner'
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
  created_at: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'created_at'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'description'
  },
  description_origin: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'description_origin'
  },
  verified: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'verified'
  },
  organization: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'organization'
  },
  top: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'top'
  },
  last_check: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: dbHandle.twitter_monitor.fn('current_timestamp'),
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'last_check'
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
  cursor: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'cursor'
  },
  last_cursor: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'last_cursor'
  },
  deleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'deleted'
  },
  locked: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'locked'
  },
  hidden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'hidden'
  },
  new: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'new'
  }
};
const options = {
  modelName: 'v2_account_info',
  tableName: 'v2_account_info', 
  sequelize: dbHandle.twitter_monitor,
  indexes: []
};
V2AccountInfo.init(attributes, options);
export default V2AccountInfo;