/**
 * 入口页面：entry/src/main/ets/pages/Index.ets
 * 装载 TaskListPage 组件（main_pages.json 声明 pages/Index）。
 */

import { TaskListPage } from './TaskListPage';

@Entry
@Component
struct Index {
  build() {
    Column() {
      TaskListPage()
    }
    .width('100%')
    .height('100%')
  }
}
