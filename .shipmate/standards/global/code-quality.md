# Code Quality Standards

Apply these quality principles to maintain a healthy, maintainable codebase.

## SOLID Principles

1. **Single Responsibility**: Each class, function, or module has one reason to change
2. **Open/Closed**: Software entities should be open for extension but closed for modification
3. **Liskov Substitution**: Derived classes must be substitutable for their base classes
4. **Interface Segregation**: Clients should not depend on interfaces they don't use
5. **Dependency Inversion**: Depend on abstractions, not concretions

## Core Design Principles

- **DRY (Don't Repeat Yourself)**: Abstract common functionality, eliminate duplication
- **KISS (Keep It Simple)**: Prefer simplicity over complexity in all design decisions
- **YAGNI (You Aren't Gonna Need It)**: Implement only current requirements, avoid speculative features
- **Composition Over Inheritance**: Favor object composition over class inheritance
- **Separation of Concerns**: Divide program functionality into distinct sections
- **Loose Coupling**: Minimize dependencies between components
- **High Cohesion**: Related functionality should be grouped together logically

## Code Clarity

- **Self-Documenting Code**: Code should be readable without excessive comments
- **Meaningful Names**: Variables, functions, and classes should reveal intent
- **Small Functions**: Functions should do one thing and do it well (< 30 lines ideal)
- **Limited Parameters**: Functions should have few parameters (3 or fewer ideal)
- **Consistent Abstraction Levels**: Don't mix high-level and low-level operations in the same function

## Technical Debt Management

- **Address as You Go**: Fix small issues when you encounter them
- **Document Known Debt**: Use TODO/FIXME comments with ticket references
- **Avoid Workarounds**: Prefer proper solutions over quick hacks
- **Refactor Incrementally**: Improve code quality with each change
- **Track Debt**: Log significant debt items for future planning

## Testability

- **Design for Testability**: Structure code to be easily unit tested
- **Dependency Injection**: Inject dependencies to enable mocking
- **Pure Functions**: Prefer pure functions where possible
- **Avoid Global State**: Minimize shared mutable state
- **Clear Boundaries**: Define clear interfaces between modules

## Performance Awareness

- **Measure First**: Profile before optimizing - don't guess at bottlenecks
- **Optimize Critical Paths**: Focus effort on hot paths with measured impact
- **Avoid Premature Optimization**: Clarity and correctness first
- **Consider Complexity**: Be aware of algorithmic complexity (Big O)
- **Resource Management**: Properly handle memory, connections, and file handles

## Code Review Standards

- **Every Change Reviewed**: No code merges without peer review
- **Focus on Substance**: Review logic, security, and design - not just style
- **Be Constructive**: Provide actionable feedback with suggestions
- **Timely Reviews**: Complete reviews promptly to maintain flow
- **Knowledge Sharing**: Use reviews as learning opportunities

## Quality Metrics

Track and maintain:
- **Test Coverage**: Aim for 80%+ on business logic, 70%+ overall
- **Complexity Metrics**: Keep cyclomatic complexity manageable (< 10 per function)
- **Duplication**: Minimize code duplication (< 3% threshold)
- **Dependencies**: Keep dependency count reasonable and up-to-date
- **Build Health**: Maintain passing builds and fast CI feedback
