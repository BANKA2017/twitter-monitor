import { Sequelize } from 'sequelize';
import dbHandle from '../../core/Core.db.mjs';
const {
  DataTypes,
  Model
} = Sequelize;

class AnalyticsAccountList extends Model {}

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
  previous: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'previous'
  },
  raw: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: false,
    autoIncrement: false,
    comment: '',
    field: 'raw'
  }
};
const options = {
  modelName: 'analytics_account_list',
  tableName: 'analytics_account_list',
  sequelize: dbHandle.analytics,
  indexes: [{
    name: 'uid',
    unique: false,
    using: 'BTREE',
    fields: ['uid']
  }, {
    name: 'previous',
    unique: false,
    using: 'BTREE',
    fields: ['previous']
  }]
};
AnalyticsAccountList.init(attributes, options);
export default AnalyticsAccountList;