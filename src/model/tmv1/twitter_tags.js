import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class TwitterTags extends Model {}

const attributes = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    comment: '',
    field: 'id'
  },
  tag: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'tag'
  },
  tweet_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'tweet_id'
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
  account: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: '0',
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'account'
  }
};
const options = {
  modelName: 'twitter_tags',
  tableName: 'twitter_tags',
  sequelize: dbHandle.tmv1,
  indexes: [{
    name: 'tweet_id',
    unique: false,
    using: 'BTREE',
    fields: ['tweet_id']
  }]
};
TwitterTags.init(attributes, options);
export default TwitterTags;