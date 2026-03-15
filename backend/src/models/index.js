const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Profile = sequelize.define('Profile', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true },
  password_hash: { type: DataTypes.STRING },
  cargo: { type: DataTypes.ENUM('Artista', 'Produtor', 'Vendedor', 'Compositor'), allowNull: false },
  nome: { type: DataTypes.STRING, allowNull: false },
  avatar_url: { type: DataTypes.STRING },
  bio: { type: DataTypes.TEXT }
}, { tableName: 'profiles' });

const Album = sequelize.define('Album', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'albums' });

const Music = sequelize.define('Music', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('pendente', 'aprovado', 'recusado'), defaultValue: 'pendente' }
}, { tableName: 'musics' });

const Composition = sequelize.define('Composition', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  approved: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'compositions' });

const Release = sequelize.define('Release', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  release_date: { type: DataTypes.DATE }
}, { tableName: 'releases' });

const Post = sequelize.define('Post', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT }
}, { tableName: 'posts' });

const Sponsor = sequelize.define('Sponsor', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'sponsors' });

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'notifications' });

const Chat = sequelize.define('Chat', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'chats' });

const Message = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  content: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'messages' });

const PublicEvent = sequelize.define('PublicEvent', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  event_date: { type: DataTypes.DATE, allowNull: false }
}, { tableName: 'public_events' });

const Proposal = sequelize.define('Proposal', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  client_name: { type: DataTypes.STRING, allowNull: false },
  doc_url: { type: DataTypes.STRING }
}, { tableName: 'proposals' });

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  status: { type: DataTypes.ENUM('proposta', 'negociacao', 'pendente', 'pago', 'perdido'), allowNull: false, defaultValue: 'proposta' }
}, { tableName: 'leads' });

Profile.hasMany(Album, { foreignKey: 'profile_id' });
Album.belongsTo(Profile, { foreignKey: 'profile_id' });

Album.hasMany(Music, { foreignKey: 'album_id' });
Music.belongsTo(Album, { foreignKey: 'album_id' });
Profile.hasMany(Music, { foreignKey: 'profile_id' });
Music.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(Composition, { foreignKey: 'profile_id' });
Composition.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(Release, { foreignKey: 'profile_id' });
Release.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(Post, { foreignKey: 'profile_id' });
Post.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(Profile, { foreignKey: 'user_id' });

Profile.hasMany(Chat, { foreignKey: 'owner_id' });
Chat.belongsTo(Profile, { foreignKey: 'owner_id' });
Chat.hasMany(Message, { foreignKey: 'chat_id' });
Message.belongsTo(Chat, { foreignKey: 'chat_id' });
Message.belongsTo(Profile, { foreignKey: 'sender_id' });

Profile.hasMany(Proposal, { foreignKey: 'seller_id', as: 'seller_proposals' });
Proposal.belongsTo(Profile, { foreignKey: 'seller_id', as: 'seller' });
Proposal.belongsTo(Profile, { foreignKey: 'artist_id', as: 'artist' });

Profile.hasMany(Lead, { foreignKey: 'seller_id', as: 'seller_leads' });
Lead.belongsTo(Profile, { foreignKey: 'seller_id', as: 'seller' });

module.exports = {
  sequelize,
  Profile,
  Album,
  Music,
  Composition,
  Release,
  Post,
  Sponsor,
  Notification,
  Chat,
  Message,
  PublicEvent,
  Proposal,
  Lead
};
