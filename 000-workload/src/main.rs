use actix_files as fs;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use postgres::{Client, NoTls};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(fs::Files::new("/assets", "./assets"))
            .route("/", web::get().to(greet))
            .route("/health", web::get().to(health))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}

// This is not a health check
async fn health(_req: HttpRequest) -> impl Responder {
    HttpResponse::Ok()
}

async fn greet(_req: HttpRequest) -> impl Responder {
    let sql =
        r#"SELECT * FROM quotes OFFSET floor(random() * (SELECT COUNT(*) FROM quotes)) LIMIT 1;"#;

    let mut client =
        match Client::connect("host=postgres user=postgres, password=postgresql123", NoTls) {
            Ok(c) => c,
            Err(_) => {
                return HttpResponse::Ok().body(
                    r#"
                <html>
                <head>
                    <title>v1 | Klustered</title>
                </head>
                <body>
                    <strong>Failed to connect to database</strong>
                </body>
                </html>
        "#,
                );
            }
        };

    match client.query(sql, &[]) {
        Ok(result) => {
            let row = result.first().unwrap();

            let quote: &str = row.get(0);
            let author: &str = row.get(1);
            let link: &str = row.get(2);

            return HttpResponse::Ok().body(format!(
                r#"
                <html>
                <head>
                    <title>v1 | Klustered</title>
                </head>
                <body>
                    <center>
                        <strong>{}</strong> by <a href="{}">{}</a>
                        <video width="1280" height="720" controls>
                            <source src="/assets/video.mp4" type="video/mp4">
                        </video>
                    </center>
                </body>
                </html>
        "#,
                quote, link, author
            ));
        }
        Err(_) => {
            return HttpResponse::Ok().body(
                r#"
                <html>
                <head>
                    <title>v1 | Klustered</title>
                </head>
                <body>
                    <strong>Failed to query to database</strong>
                </body>
                </html>
        "#,
            );
        }
    }
}
