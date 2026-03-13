# Nutshell StartOS v0.3.x Makefile

PKG_ID := nutshell
PKG_VERSION := 0.19.2
DOCKER_IMAGE := nutshell

# Build the .s9pk package
all: $(PKG_ID).s9pk

# Build the docker image for the local architecture
docker:
	docker build -t $(DOCKER_IMAGE) .

# Build for both architectures (requires a registry if using --push, or just build without loading)
docker-multi:
	docker buildx build --platform linux/amd64,linux/arm64 -t $(DOCKER_IMAGE) .

# Package everything into the StartOS format
$(PKG_ID).s9pk: manifest.yaml scripts/config_spec.yaml scripts/config.sh icon.png LICENSE docker_entrypoint.sh scripts/health.sh image.tar pack.py
	# Make sure shell scripts are executable
	chmod +x scripts/config.sh docker_entrypoint.sh scripts/health.sh
	python3 pack.py

image.tar:
	sudo docker save $(DOCKER_IMAGE) -o image.tar

clean:
	rm -f $(PKG_ID).s9pk
