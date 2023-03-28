import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class AccountInfo extends Model {}

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
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'uid'
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
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'following'
  },
  followers: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  lang: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'lang'
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
    defaultValue: dbHandle.tmv1.literal('CURRENT_TIMESTAMP'),
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'last_check'
  },
  tag: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'tag'
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
    allowNull: false,
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
  project: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'project'
  }
};
const options = {
  modelName: 'account_info',
  tableName: 'account_info',
  sequelize: dbHandle.tmv1,
  indexes: []
};
AccountInfo.init(attributes, options);
export default AccountInfo;