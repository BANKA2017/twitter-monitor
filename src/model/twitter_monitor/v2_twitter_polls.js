import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class V2TwitterPolls extends Model {}

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
  tweet_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'tweet_id'
  },
  origin_tweet_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'origin_tweet_id'
  },
  choice_label: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'choice_label'
  },
  poll_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'poll_order'
  },
  end_datetime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'end_datetime'
  },
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'count'
  },
  checked: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'checked'
  },
  hidden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'hidden'
  }
};
const options = {
  modelName: 'v2_twitter_polls',
  tableName: 'v2_twitter_polls', 
  sequelize: dbHandle.twitter_monitor,
  indexes: [{
    name: 'uid',
    unique: false,
    using: 'BTREE',
    fields: ['uid']
  }, {
    name: 'tweet_id',
    unique: false,
    using: 'BTREE',
    fields: ['tweet_id']
  }]
};
V2TwitterPolls.init(attributes, options);
export default V2TwitterPolls;