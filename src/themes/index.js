// 主题注册中心
// 新增主题只需：
// 1. 在 themes/ 目录创建新的主题文件
// 2. 在此文件导入并注册

import animalForest from './animal-forest.js';
import oceanBreeze from './ocean-breeze.js';
import diyThemes from './diy-themes.js';

// 导出所有主题
export const themes = {
  'animal-forest': animalForest,
  'ocean-breeze': oceanBreeze,
  'diy-themes': diyThemes
};

// 获取主题（带默认值）
export function getTheme(themeName) {
  return themes[themeName] || themes['animal-forest'];
}

// 获取主题列表（用于后台选择）
export function getThemeList() {
  return Object.entries(themes).map(([key, theme]) => ({
    value: key,
    name: theme.name
  }));
}
