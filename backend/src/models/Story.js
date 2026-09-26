const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Story do Perfil Social do Feed.
 *
 * Fica em tabela propria (e nao no memory store) porque precisa de
 * expires_at consultavel e sobreviver a reinicios do servidor. O registro
 * nao e apagado ao expirar: o backend simplesmente deixa de entrega-lo.
 */
class Story extends Model {}

Story.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  user_id: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'image' },
  media_url: { type: DataTypes.TEXT, allowNull: true },
  text_content: { type: DataTypes.TEXT, allowNull: true },
  background: { type: DataTypes.STRING, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  expires_at: { type: DataTypes.DATE, allowNull: false }
}, {
  sequelize,
  modelName: 'stories',
  tableName: 'stories',
  timestamps: false
});

/**
 * Registro de visualizacao. O indice unico (story_id + viewer_user_id)
 * garante 1 visualizacao por pessoa: reabrir atualiza o mesmo registro.
 */
class StoryView extends Model {}

StoryView.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  story_id: { type: DataTypes.STRING, allowNull: false },
  viewer_user_id: { type: DataTypes.STRING, allowNull: false },
  viewed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  modelName: 'story_views',
  tableName: 'story_views',
  timestamps: false
});

module.exports = { Story, StoryView };
