/**
 * 软件单元：entry/src/main/ets/viewmodel/TaskListViewModel.ets
 * TaskListViewModel 状态与筛选（对应图谱：su-task-viewmodel / le-task-list-viewmodel / imp-task-viewmodel）。
 * 承载 新增/编辑/删除/完成态切换/筛选/统计 的业务逻辑，页面只做渲染与触发。
 */

import { Task } from '../model/Task';
import { TaskRepository } from '../data/TaskRepository';
import { PlatformBridge } from '../platform/PlatformBridge';

export class TaskFilter {
  static readonly ALL: string = 'all';
  static readonly ACTIVE: string = 'active';
  static readonly COMPLETED: string = 'completed';
}

export class TaskListViewModel {
  private repo: TaskRepository = new TaskRepository();
  private filter: string = TaskFilter.ALL;

  async load(): Promise<void> {
    await this.repo.init();
  }

  getFilter(): string {
    return this.filter;
  }

  setFilter(filter: string): void {
    this.filter = filter;
  }

  /** 按当前筛选返回可见任务。 */
  getVisibleTasks(): Task[] {
    const all: Task[] = this.repo.getAll();
    const result: Task[] = [];
    for (let i = 0; i < all.length; i++) {
      const task: Task = all[i];
      if (this.filter === TaskFilter.ACTIVE && task.completed) {
        continue;
      }
      if (this.filter === TaskFilter.COMPLETED && !task.completed) {
        continue;
      }
      result.push(task);
    }
    return result;
  }

  getActiveCount(): number {
    let count: number = 0;
    const all: Task[] = this.repo.getAll();
    for (let i = 0; i < all.length; i++) {
      if (!all[i].completed) {
        count = count + 1;
      }
    }
    return count;
  }

  getCompletedCount(): number {
    let count: number = 0;
    const all: Task[] = this.repo.getAll();
    for (let i = 0; i < all.length; i++) {
      if (all[i].completed) {
        count = count + 1;
      }
    }
    return count;
  }

  addTask(title: string, description: string): void {
    const all: Task[] = this.repo.getAll();
    all.unshift(new Task(PlatformBridge.newId(), title, description, false));
    this.repo.replaceAll(all);
    PlatformBridge.log('addTask: ' + title);
  }

  updateTask(id: string, title: string, description: string): void {
    const all: Task[] = this.repo.getAll();
    for (let i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        all[i].title = title;
        all[i].description = description;
        break;
      }
    }
    this.repo.replaceAll(all);
  }

  toggleTask(id: string): void {
    const all: Task[] = this.repo.getAll();
    for (let i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        all[i].completed = !all[i].completed;
        break;
      }
    }
    this.repo.replaceAll(all);
  }

  removeTask(id: string): void {
    const all: Task[] = this.repo.getAll();
    const remaining: Task[] = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].id !== id) {
        remaining.push(all[i]);
      }
    }
    this.repo.replaceAll(remaining);
  }

  async persist(): Promise<void> {
    await this.repo.persist();
  }
}
