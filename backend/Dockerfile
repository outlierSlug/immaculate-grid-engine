# Multi-stage: full JDK+Maven only in the build stage, a slim JRE in the
# final image - the deployed container doesn't need Maven or the resolved
# dependency tree, only the built jar and a JVM to run it.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# pom.xml copied separately from src/ so the dependency-resolution layer
# stays cached across builds where only source files changed.
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src src
# -DskipTests: this project's tests hit a real Postgres
# (@DataJpaTest + @AutoConfigureTestDatabase(Replace.NONE), no embedded
# H2), which isn't available during this build. Testing stays a
# local/pre-push step, same as every other deploy path for this project.
RUN mvn -q clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
