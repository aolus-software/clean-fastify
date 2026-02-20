import "reflect-metadata";

import { container } from "tsyringe";

// Export the container instance for manual resolution if needed
export { container };

// Export dependency injection decorators
export { inject, injectable, scoped, singleton } from "tsyringe";
