import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class TmpTwitterData extends Model {}

const attributes = {
  uid: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: '0',
    primaryKey: true,
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
  },
  visible: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '1',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'visible'
  }
};
const options = {
  modelName: 'tmp_twitter_data',
  tableName: 'tmp_twitter_data', 
  sequelize: dbHandle.twitter_monitor,
  indexes: [{
    name: 'uid',
    unique: false,
    using: 'BTREE',
    fields: ['uid']
  }]
};
TmpTwitterData.init(attributes, options);
export default TmpTwitterData;