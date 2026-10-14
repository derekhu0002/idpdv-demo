/**
 * 软件单元：entry/src/main/ets/model/Task.ets
 * Task 数据模型（对应图谱：su-task-model / le-task-model / imp-task-model）。
 * 纯数据 + JSON 序列化，不依赖任何平台能力。
 */

export interface TaskJson {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export class Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;

  constructor(id: string, title: string, description: string, completed: boolean) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.completed = completed;
  }

  static fromJson(json: TaskJson): Task {
    return new Task(json.id, json.title, json.description, json.completed);
  }

  toJson(): TaskJson {
    const json: TaskJson = {
      id: this.id,
      title: this.title,
      description: this.description,
      completed: this.completed
    };
    return json;
  }
}
