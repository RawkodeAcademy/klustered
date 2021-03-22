FROM rust:1

COPY . /code
WORKDIR /code

RUN cargo build --release

FROM rust:1 AS base

WORKDIR /workload
ENTRYPOINT [ "./httpd" ]

FROM base AS v1

COPY /assets/One.mp4 /workload/assets/video.mp4
COPY --from=0 /code/target/release/workload /workload/httpd

FROM base AS v2

COPY /assets/Two.mp4 /workload/assets/video.mp4
COPY --from=0 /code/target/release/workload /workload/httpd
